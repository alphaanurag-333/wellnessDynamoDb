const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createProtocolVersion,
  deleteProtocolVersion,
  listProtocolVersionsByUserId,
  toPublicProtocolVersion,
  updateProtocolVersion,
} = require("../../models/userProtocolSettingModel");
const {
  readUserIdParam,
  loadTargetUser,
  handleValidationError,
} = require("../helpers/reminderControllerHelpers");
const { assertStaffCanAccessUser, resolveStaffActor } = require("../staffAccess");
const { notifyProtocolSettingsDesignStartedToUserAsync } = require("../../services/whatsappJourneyService");

function parsePointList(raw) {
  if (!Array.isArray(raw)) return null;
  return raw.map((point) => {
    if (point && typeof point === "object") return String(point.text ?? point.point ?? "").trim();
    return String(point ?? "").trim();
  });
}

function parseSectionsBody(body) {
  if (Array.isArray(body?.sections)) {
    return body.sections.map((section) => ({
      id: section?.id,
      heading: section?.heading ?? section?.title ?? "",
      points: parsePointList(section?.points) || [],
    }));
  }

  const points = parsePointList(body?.points ?? body?.items);
  if (!points) {
    throw new AppError("sections must be an array", 400);
  }

  return [{
    heading: String(body?.heading || "Protocol").trim() || "Protocol",
    points,
  }];
}

async function staffProtocolContext(req) {
  const actor = resolveStaffActor(req);
  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  return { actor, userId, user };
}

function mapHistory(items) {
  return items.map(toPublicProtocolVersion).filter(Boolean);
}

exports.getStaffUserProtocolSettingsController = asyncHandler(async (req, res) => {
  const { userId } = await staffProtocolContext(req);
  const result = await listProtocolVersionsByUserId(userId, { page: 1, limit: 100 });
  const history = mapHistory(result.items);
  const current = history[0] || null;

  return res.status(200).json({
    status: true,
    message: "Protocol settings fetched",
    current,
    history,
    pagination: result.pagination,
  });
});

exports.saveStaffUserProtocolSettingsController = asyncHandler(async (req, res) => {
  const { actor, userId, user } = await staffProtocolContext(req);
  const sections = parseSectionsBody(req.body || {});
  const prior = await listProtocolVersionsByUserId(userId, { page: 1, limit: 1 });
  const isFirstVersion = !prior.items?.length;

  let created;
  try {
    created = await createProtocolVersion({
      userId,
      sections,
      savedById: actor.id,
      savedByRole: actor.role,
      savedByName: actor.displayName,
    });
  } catch (err) {
    handleValidationError(err);
  }

  if (isFirstVersion) {
    notifyProtocolSettingsDesignStartedToUserAsync(user);
  }

  const result = await listProtocolVersionsByUserId(userId, { page: 1, limit: 100 });
  const history = mapHistory(result.items);
  const current = toPublicProtocolVersion(created) || history[0] || null;

  return res.status(201).json({
    status: true,
    message: `Protocol saved as v${current?.version || created?.version}`,
    current,
    history,
  });
});

exports.updateStaffUserProtocolSettingsController = asyncHandler(async (req, res) => {
  const { userId } = await staffProtocolContext(req);
  const versionId = String(req.params.versionId || "").trim();
  if (!versionId) throw new AppError("Protocol version is required", 400);

  const sections = parseSectionsBody(req.body || {});
  try {
    await updateProtocolVersion({ userId, versionId, sections });
  } catch (err) {
    if (err?.name === "NotFoundError") throw new AppError(err.message, 404);
    handleValidationError(err);
  }

  const result = await listProtocolVersionsByUserId(userId, { page: 1, limit: 100 });
  const history = mapHistory(result.items);
  const current = history[0] || null;
  const updated = history.find((item) => String(item.id) === versionId) || null;

  return res.status(200).json({
    status: true,
    message: updated?.version ? `Protocol v${updated.version} updated` : "Protocol updated",
    current,
    history,
  });
});

exports.deleteStaffUserProtocolSettingsController = asyncHandler(async (req, res) => {
  const { userId } = await staffProtocolContext(req);
  const versionId = String(req.params.versionId || "").trim();
  if (!versionId) throw new AppError("Protocol version is required", 400);

  try {
    await deleteProtocolVersion({ userId, versionId });
  } catch (err) {
    if (err?.name === "NotFoundError") throw new AppError(err.message, 404);
    handleValidationError(err);
  }

  const result = await listProtocolVersionsByUserId(userId, { page: 1, limit: 100 });
  const history = mapHistory(result.items);
  const current = history[0] || null;

  return res.status(200).json({
    status: true,
    message: "Protocol version deleted",
    current,
    history,
  });
});
