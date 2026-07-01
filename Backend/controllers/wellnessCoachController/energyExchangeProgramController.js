const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById, updateUser } = require("../../models/userModel");
const {
  createProgram,
  getProgramById,
  updateProgram,
  listProgramsByUserId,
  toPublicProgram,
} = require("../../models/energyExchangeProgramModel");
const { getAppConfig } = require("../../models/appConfigModel");
const { buildFyPlansForProgram } = require("../../services/energyExchangePricingService");
const {
  validateCoachEnergyExchangeDiscounts,
  toPublicDiscountLimits,
} = require("../../utils/energyExchangeDiscountLimits");
const {
  listSubscriptionsByUserId,
  toPublicSubscription,
} = require("../../models/energyExchangeSubscriptionModel");

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

async function assertCoachOwnsProgram(coachId, program) {
  if (!program) throw new AppError("Program not found", 404);
  if (String(program.coachId) !== String(coachId)) {
    throw new AppError("Forbidden", 403);
  }
}

function parseDiscountsBody(body) {
  return body?.fyDiscounts ?? body?.fy_discounts;
}

function parseTimeBasedBody(body) {
  return body?.timeBasedDiscount ?? body?.time_based_discount;
}

async function assertCoachDiscountsAllowed(body, appConfig) {
  const err = validateCoachEnergyExchangeDiscounts(
    {
      fyDiscounts: parseDiscountsBody(body),
      timeBasedDiscount: parseTimeBasedBody(body),
    },
    appConfig
  );
  if (err) throw new AppError(err, 400);
}

exports.listProgramsForUserController = asyncHandler(async (req, res) => {
  const coachId = getCoachId(req);
  const userId = String(req.query.userId || req.query.user_id || "").trim();
  if (!userId) throw new AppError("userId is required", 400);

  const user = await getUserById(userId);
  if (!user) throw new AppError("Client not found", 404);
  assertCoachOwnsUser(coachId, user);

  const result = await listProgramsByUserId(userId, { page: 1, limit: 50 });
  const ownPrograms = result.items.filter((p) => String(p.coachId) === String(coachId));

  return res.status(200).json({
    status: true,
    message: "Energy Exchange programs fetched",
    programs: ownPrograms.map(toPublicProgram),
  });
});

exports.createProgramController = asyncHandler(async (req, res) => {
  const coachId = getCoachId(req);
  const body = req.body || {};
  const userId = String(body.userId || body.user_id || "").trim();
  if (!userId) throw new AppError("userId is required", 400);

  const user = await getUserById(userId);
  if (!user) throw new AppError("Client not found", 404);
  assertCoachOwnsUser(coachId, user);

  const appConfig = await getAppConfig();
  const defaultMonthly = Number(appConfig?.energy_exchange_monthly_amount) || 0;
  const defaultDiscounts = appConfig?.energy_exchange_default_fy_discounts || {};

  await assertCoachDiscountsAllowed(body, appConfig);

  const program = await createProgram({
    userId,
    coachId,
    coachType: "wellness_coach",
    title: body.title,
    programType: body.programType ?? body.program_type,
    description: body.description,
    enabled: body.enabled === true || body.enabled === "true",
    monthlyAmount:
      body.monthlyAmount != null
        ? Number(body.monthlyAmount)
        : body.monthly_amount != null
          ? Number(body.monthly_amount)
          : defaultMonthly,
    currency: body.currency || "INR",
    fyDiscounts: parseDiscountsBody(body) ?? defaultDiscounts,
    timeBasedDiscount: parseTimeBasedBody(body),
  });

  if (program.enabled) {
    await updateUser(userId, { energyExchangeEnabled: true });
  }

  return res.status(201).json({
    status: true,
    message: "Energy Exchange program created",
    program: toPublicProgram(program),
  });
});

exports.getProgramController = asyncHandler(async (req, res) => {
  const coachId = getCoachId(req);
  const program = await getProgramById(req.params.id);
  await assertCoachOwnsProgram(coachId, program);
  return res.status(200).json({
    status: true,
    message: "Energy Exchange program fetched",
    program: toPublicProgram(program),
  });
});

exports.updateProgramController = asyncHandler(async (req, res) => {
  const coachId = getCoachId(req);
  const program = await getProgramById(req.params.id);
  await assertCoachOwnsProgram(coachId, program);

  const body = req.body || {};
  const updates = {};
  if (body.title !== undefined) updates.title = String(body.title);
  if (body.programType !== undefined || body.program_type !== undefined) {
    updates.programType = String(body.programType ?? body.program_type);
  }
  if (body.description !== undefined) updates.description = String(body.description);
  if (body.enabled !== undefined) updates.enabled = body.enabled === true || body.enabled === "true";
  if (body.monthlyAmount !== undefined) updates.monthlyAmount = Number(body.monthlyAmount);
  if (body.monthly_amount !== undefined) updates.monthlyAmount = Number(body.monthly_amount);
  if (body.currency !== undefined) updates.currency = String(body.currency);
  if (parseDiscountsBody(body) !== undefined) updates.fyDiscounts = parseDiscountsBody(body);
  if (parseTimeBasedBody(body) !== undefined) updates.timeBasedDiscount = parseTimeBasedBody(body);

  if (!Object.keys(updates).length) {
    throw new AppError("No valid fields to update", 400);
  }

  if (parseDiscountsBody(body) !== undefined || parseTimeBasedBody(body) !== undefined) {
    const appConfig = await getAppConfig();
    await assertCoachDiscountsAllowed(body, appConfig);
  }

  const updated = await updateProgram(program.id, updates);

  if (updates.enabled !== undefined) {
    await updateUser(program.userId, { energyExchangeEnabled: Boolean(updates.enabled) });
  }

  return res.status(200).json({
    status: true,
    message: "Energy Exchange program updated",
    program: toPublicProgram(updated),
  });
});

exports.enableProgramController = asyncHandler(async (req, res) => {
  const coachId = getCoachId(req);
  const program = await getProgramById(req.params.id);
  await assertCoachOwnsProgram(coachId, program);
  const updated = await updateProgram(program.id, { enabled: true });
  await updateUser(program.userId, { energyExchangeEnabled: true });
  return res.status(200).json({
    status: true,
    message: "Energy Exchange program enabled",
    program: toPublicProgram(updated),
  });
});

exports.disableProgramController = asyncHandler(async (req, res) => {
  const coachId = getCoachId(req);
  const program = await getProgramById(req.params.id);
  await assertCoachOwnsProgram(coachId, program);
  const updated = await updateProgram(program.id, { enabled: false });
  await updateUser(program.userId, { energyExchangeEnabled: false });
  return res.status(200).json({
    status: true,
    message: "Energy Exchange program disabled",
    program: toPublicProgram(updated),
  });
});

exports.previewProgramController = asyncHandler(async (req, res) => {
  const coachId = getCoachId(req);
  const program = await getProgramById(req.params.id);
  await assertCoachOwnsProgram(coachId, program);

  const { plans, currentFy, fyStartMonth } = await buildFyPlansForProgram(program.id);
  return res.status(200).json({
    status: true,
    message: "Program preview generated",
    program: toPublicProgram(program),
    plans,
    currentFy,
    fyStartMonth,
  });
});

exports.getEnergyExchangeForUserController = asyncHandler(async (req, res) => {
  const coachId = getCoachId(req);
  const userId = req.params.userId || req.params.id;
  const user = await getUserById(userId);
  if (!user) throw new AppError("Client not found", 404);
  assertCoachOwnsUser(coachId, user);

  const [programsResult, subsResult] = await Promise.all([
    listProgramsByUserId(userId, { page: 1, limit: 50 }),
    listSubscriptionsByUserId(userId, { page: 1, limit: 200 }),
  ]);

  const myPrograms = programsResult.items.filter((p) => String(p.coachId) === String(coachId));
  const appConfig = await getAppConfig();

  return res.status(200).json({
    status: true,
    message: "Energy Exchange detail fetched",
    discountLimits: toPublicDiscountLimits(appConfig),
    user: {
      id: user.id,
      _id: user.id,
      name: user.name,
      email: user.email,
      userTier: user.userTier,
      energyExchangeEnabled: Boolean(user.energyExchangeEnabled),
      paidOnboardingCompleted: Boolean(user.paidOnboardingCompleted),
      paidOnboardingStep: user.paidOnboardingStep || null,
      healPaidAt: user.healPaidAt || null,
    },
    programs: myPrograms.map(toPublicProgram),
    subscriptions: subsResult.items.map(toPublicSubscription),
  });
});
