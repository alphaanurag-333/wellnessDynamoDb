const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createHealConsultancyTrack,
  deleteHealConsultancyTrack,
  listHealConsultancyTracksByUserId,
  updateHealConsultancyTrack,
  toPublicHealConsultancyTrack,
} = require("../../models/userHealConsultancyTrackModel");
const {
  readUserIdParam,
  readPagination,
  parseCoachCreateBody,
  parseStatusUpdateBody,
  loadHealUser,
  loadTrackForUser,
  resolveCoachHierarchy,
  assertCoachCanAccessUser,
  handleValidationError,
} = require("../healConsultancyTrackControllerHelpers");

exports.listCoachHealConsultancyTracksController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub || req.user?.id;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadHealUser(userId);
  await assertCoachCanAccessUser(user, coachId);

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

exports.createCoachHealConsultancyTrackController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub || req.user?.id;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadHealUser(userId);
  await assertCoachCanAccessUser(user, coachId);

  const body = parseCoachCreateBody(req.body || {});
  const hierarchy = resolveCoachHierarchy(user);

  let track;
  try {
    track = await createHealConsultancyTrack({
      userId,
      parentCoachId: hierarchy.parentCoachId,
      assignedCoachId: hierarchy.assignedCoachId,
      assignedCoachType: hierarchy.assignedCoachType,
      concern: body.concern,
      status: body.status,
      scheduledAt: body.scheduledAt,
      meetingLink: body.meetingLink,
      coachNotes: body.coachNotes,
      statusUpdatedByRole: "wellness_coach",
      statusUpdatedById: coachId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Consultancy track created",
    data: { track: toPublicHealConsultancyTrack(track) },
  });
});

exports.updateCoachHealConsultancyTrackController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub || req.user?.id;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const trackId = String(req.params.trackId || "").trim();
  const user = await loadHealUser(userId);
  await assertCoachCanAccessUser(user, coachId);
  await loadTrackForUser(trackId, userId);

  const updates = parseStatusUpdateBody(req.body || {});
  let track;
  try {
    track = await updateHealConsultancyTrack(trackId, {
      ...updates,
      statusUpdatedByRole: "wellness_coach",
      statusUpdatedById: coachId,
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

exports.deleteCoachHealConsultancyTrackController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub || req.user?.id;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const trackId = String(req.params.trackId || "").trim();
  const user = await loadHealUser(userId);
  await assertCoachCanAccessUser(user, coachId);
  await loadTrackForUser(trackId, userId);

  try {
    await deleteHealConsultancyTrack(trackId);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Consultancy track not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Consultancy track deleted",
  });
});
