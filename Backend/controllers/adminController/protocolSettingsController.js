const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createProtocolVersion,
  listProtocolVersionsByUserId,
  toPublicProtocolVersion,
} = require("../../models/userProtocolSettingModel");
const {
  readUserIdParam,
  loadTargetUser,
  handleValidationError,
} = require("../helpers/reminderControllerHelpers");
const { assertStaffCanAccessUser, resolveStaffActor } = require("../staffAccess");

function parsePointsBody(body) {
  const raw = body?.points ?? body?.items;
  if (!Array.isArray(raw)) {
    throw new AppError("points must be an array of strings", 400);
  }
  return raw.map((point) => {
    if (point && typeof point === "object") return String(point.text ?? point.point ?? "").trim();
    return String(point ?? "").trim();
  });
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
  const { actor, userId } = await staffProtocolContext(req);
  const points = parsePointsBody(req.body || {});

  let created;
  try {
    created = await createProtocolVersion({
      userId,
      points,
      savedById: actor.id,
      savedByRole: actor.role,
      savedByName: actor.displayName,
    });
  } catch (err) {
    handleValidationError(err);
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
