const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createGutReset,
  listGutResetsByUserId,
  toPublicGutReset,
} = require("../../models/userGutResetModel");
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

async function staffGutResetContext(req) {
  const actor = resolveStaffActor(req);
  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  return { actor, userId, user };
}

function mapHistory(items) {
  return items.map(toPublicGutReset).filter(Boolean);
}

exports.getStaffUserGutResetsController = asyncHandler(async (req, res) => {
  const { userId } = await staffGutResetContext(req);
  const result = await listGutResetsByUserId(userId, { page: 1, limit: 100 });
  const history = mapHistory(result.items);

  return res.status(200).json({
    status: true,
    message: "Gut reset history fetched",
    history,
    pagination: result.pagination,
  });
});

exports.saveStaffUserGutResetController = asyncHandler(async (req, res) => {
  const { actor, userId } = await staffGutResetContext(req);
  const body = req.body || {};
  const points = parsePointsBody(body);

  let created;
  try {
    created = await createGutReset({
      userId,
      startDate: body.startDate,
      fruitVegDate: body.fruitVegDate,
      waterFastDate: body.waterFastDate,
      points,
      savedById: actor.id,
      savedByRole: actor.role,
      savedByName: actor.displayName,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const result = await listGutResetsByUserId(userId, { page: 1, limit: 100 });
  const history = mapHistory(result.items);
  const current = toPublicGutReset(created) || history[0] || null;

  return res.status(201).json({
    status: true,
    message: "Gut reset plan saved",
    current,
    history,
  });
});
