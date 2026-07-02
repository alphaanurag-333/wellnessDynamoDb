const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById, updateUser } = require("../../models/userModel");
const {
  getProgramCatalogById,
  getProgramCatalogRecordById,
  listActiveProgramCatalog,
} = require("../../models/programCatalogModel");
const {
  createUserProgram,
  getUserProgramById,
  updateUserProgram,
  listUserProgramsByUserId,
  cancelAssignedProgramsForUser,
  toPublicUserProgram,
  normalizeStatus,
} = require("../../models/userProgramModel");

function getCoachId(req) {
  return req.auth?.sub || req.user?.id || null;
}

function assertCoachOwnsUser(coachId, user) {
  if (!coachId) throw new AppError("Unauthorized", 401);
  const ownerId = String(user?.parentCoachId || "").trim();
  if (ownerId !== String(coachId).trim()) {
    throw new AppError("Forbidden — client not assigned to this coach", 403);
  }
}

async function assertCoachOwnsUserProgram(coachId, program) {
  if (!program) throw new AppError("Program assignment not found", 404);
  if (String(program.coachId) !== String(coachId)) {
    throw new AppError("Forbidden", 403);
  }
}

exports.listCatalogForCoachController = asyncHandler(async (req, res) => {
  const programs = await listActiveProgramCatalog();
  return res.status(200).json({
    status: true,
    message: "Program catalog fetched",
    catalogPrograms: programs,
    programs,
  });
});

exports.listProgramsForUserController = asyncHandler(async (req, res) => {
  const coachId = getCoachId(req);
  const userId = String(req.query.userId || req.query.user_id || "").trim();
  if (!userId) throw new AppError("userId is required", 400);

  const user = await getUserById(userId);
  if (!user) throw new AppError("Client not found", 404);
  assertCoachOwnsUser(coachId, user);

  const result = await listUserProgramsByUserId(userId, { page: 1, limit: 50 });
  const ownPrograms = result.items.filter((p) => String(p.coachId) === String(coachId));

  return res.status(200).json({
    status: true,
    message: "User program assignments fetched",
    programs: ownPrograms.map(toPublicUserProgram),
  });
});

exports.createProgramAssignmentController = asyncHandler(async (req, res) => {
  const coachId = getCoachId(req);
  const body = req.body || {};
  const userId = String(body.userId || body.user_id || "").trim();
  const catalogProgramId = String(body.catalogProgramId || body.catalog_program_id || "").trim();

  if (!userId) throw new AppError("userId is required", 400);
  if (!catalogProgramId) throw new AppError("catalogProgramId is required", 400);

  const user = await getUserById(userId);
  if (!user) throw new AppError("Client not found", 404);
  assertCoachOwnsUser(coachId, user);

  if (user.programPurchased) {
    throw new AppError("Client has already purchased a Wellness Program", 409);
  }

  const catalog = await getProgramCatalogRecordById(catalogProgramId);
  if (!catalog || catalog.status !== "active") {
    throw new AppError("Program catalog entry not found or inactive", 404);
  }

  await cancelAssignedProgramsForUser(userId);

  const enabled = body.enabled === true || body.enabled === "true";
  const program = await createUserProgram({
    userId,
    coachId,
    coachType: "wellness_coach",
    catalogProgramId: catalog.id,
    title: catalog.title,
    programType: catalog.programType,
    description: catalog.description,
    price: catalog.price,
    currency: catalog.currency,
    enabled,
    status: "assigned",
  });

  await updateUser(userId, {
    assignedProgramId: program.id,
    programEnabled: enabled,
  });

  return res.status(201).json({
    status: true,
    message: "Wellness Program assigned to client",
    program: toPublicUserProgram(program),
  });
});

exports.updateProgramAssignmentController = asyncHandler(async (req, res) => {
  const coachId = getCoachId(req);
  const program = await getUserProgramById(req.params.id);
  await assertCoachOwnsUserProgram(coachId, program);

  if (normalizeStatus(program.status) === "purchased") {
    throw new AppError("Cannot update a purchased program assignment", 409);
  }

  const body = req.body || {};
  const updates = {};
  const catalogProgramId = String(body.catalogProgramId || body.catalog_program_id || "").trim();

  if (catalogProgramId) {
    const catalog = await getProgramCatalogRecordById(catalogProgramId);
    if (!catalog || catalog.status !== "active") {
      throw new AppError("Program catalog entry not found or inactive", 404);
    }
    updates.catalogProgramId = catalog.id;
    updates.title = catalog.title;
    updates.programType = catalog.programType;
    updates.description = catalog.description;
    updates.price = catalog.price;
    updates.currency = catalog.currency;
  }

  if (body.enabled !== undefined) updates.enabled = body.enabled === true || body.enabled === "true";

  if (!Object.keys(updates).length) {
    throw new AppError("No valid fields to update", 400);
  }

  const updated = await updateUserProgram(program.id, updates);

  if (updates.enabled !== undefined) {
    await updateUser(program.userId, { programEnabled: Boolean(updates.enabled) });
  }
  if (catalogProgramId) {
    await updateUser(program.userId, { assignedProgramId: program.id });
  }

  return res.status(200).json({
    status: true,
    message: "Program assignment updated",
    program: toPublicUserProgram(updated),
  });
});

exports.enableProgramAssignmentController = asyncHandler(async (req, res) => {
  const coachId = getCoachId(req);
  const program = await getUserProgramById(req.params.id);
  await assertCoachOwnsUserProgram(coachId, program);

  if (normalizeStatus(program.status) === "purchased") {
    throw new AppError("Program already purchased", 409);
  }

  const updated = await updateUserProgram(program.id, { enabled: true });
  await updateUser(program.userId, {
    programEnabled: true,
    assignedProgramId: program.id,
  });

  return res.status(200).json({
    status: true,
    message: "Wellness Program enabled for client",
    program: toPublicUserProgram(updated),
  });
});

exports.disableProgramAssignmentController = asyncHandler(async (req, res) => {
  const coachId = getCoachId(req);
  const program = await getUserProgramById(req.params.id);
  await assertCoachOwnsUserProgram(coachId, program);

  if (normalizeStatus(program.status) === "purchased") {
    throw new AppError("Cannot disable a purchased program", 409);
  }

  const updated = await updateUserProgram(program.id, { enabled: false });
  await updateUser(program.userId, { programEnabled: false });

  return res.status(200).json({
    status: true,
    message: "Wellness Program disabled for client",
    program: toPublicUserProgram(updated),
  });
});

exports.getProgramForClientController = asyncHandler(async (req, res) => {
  const coachId = getCoachId(req);
  const userId = req.params.userId || req.params.id;
  const user = await getUserById(userId);
  if (!user) throw new AppError("Client not found", 404);
  assertCoachOwnsUser(coachId, user);

  const [catalogPrograms, assignmentsResult] = await Promise.all([
    listActiveProgramCatalog(),
    listUserProgramsByUserId(userId, { page: 1, limit: 50 }),
  ]);

  const myPrograms = assignmentsResult.items.filter((p) => String(p.coachId) === String(coachId));

  return res.status(200).json({
    status: true,
    message: "Client program detail fetched",
    user: {
      id: user.id,
      _id: user.id,
      name: user.name,
      email: user.email,
      userTier: user.userTier,
      programEnabled: Boolean(user.programEnabled),
      programPurchased: Boolean(user.programPurchased),
      programPurchasedAt: user.programPurchasedAt || null,
      assignedProgramId: user.assignedProgramId || null,
    },
    catalogPrograms,
    programs: myPrograms.map(toPublicUserProgram),
  });
});
