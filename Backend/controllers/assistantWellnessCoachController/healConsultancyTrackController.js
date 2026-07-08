const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listHealConsultancyTracksByUserId,
  updateHealConsultancyTrack,
  toPublicHealConsultancyTrack,
} = require("../../models/userHealConsultancyTrackModel");
const {
  readUserIdParam,
  readPagination,
  parseStatusUpdateBody,
  loadHealUser,
  loadTrackForUser,
  assertAssistantCanAccessUser,
  handleValidationError,
} = require("../healConsultancyTrackControllerHelpers");

exports.listAssistantHealConsultancyTracksController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub || req.user?.id;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadHealUser(userId);
  await assertAssistantCanAccessUser(user, assistantId);

  const { page, limit } = readPagination(req);
  const status = req.query.status || req.query.consultancyStatus || null;
  const result = await listHealConsultancyTracksByUserId(userId, { page, limit, status });

  return res.status(200).json({
    status: true,
    message: "Consultancy tracks fetched",
    data: {
      tracks: result.items.map(toPublicHealConsultancyTrack),
      pagination: result.pagination,
    },
  });
});

exports.updateAssistantHealConsultancyTrackController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub || req.user?.id;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const trackId = String(req.params.trackId || "").trim();
  const user = await loadHealUser(userId);
  await assertAssistantCanAccessUser(user, assistantId);
  await loadTrackForUser(trackId, userId);

  const updates = parseStatusUpdateBody(req.body || {});
  let track;
  try {
    track = await updateHealConsultancyTrack(trackId, {
      ...updates,
      statusUpdatedByRole: "assistant_wellness_coach",
      statusUpdatedById: assistantId,
    });
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Consultancy track not found", 404);
    }
    handleValidationError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Consultancy track updated",
    data: { track: toPublicHealConsultancyTrack(track) },
  });
});
