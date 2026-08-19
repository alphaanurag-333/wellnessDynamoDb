const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createHealConsultancyTrack,
  deleteHealConsultancyTrack,
  listHealConsultancyTracksByUserId,
  findActiveHealConsultancyTrackByUserId,
  updateHealConsultancyTrack,
  toPublicHealConsultancyTrack,
} = require("../../models/userHealConsultancyTrackModel");
const {
  readUserIdParam,
  readPagination,
  parseCoachCreateBody,
  parseStatusUpdateBody,
  parseOfferPeriodsBody,
  parseConfirmTimeBody,
  loadHealUser,
  loadTrackForUser,
  resolveCoachHierarchy,
  assertCoachCanAccessUser,
  assertStaffCanAccessUser,
  handleValidationError,
} = require("../helpers/healConsultancyTrackControllerHelpers");
const { isScheduledAtInWindow } = require("../../utils/counsellingPeriodHelpers");
const { createZoomForMeeting } = require("../../services/onboardingMeetingService");
const {
  dispatchCounsellingPeriodsOfferedNotificationAsync,
  dispatchCounsellingScheduledNotificationAsync,
} = require("../../services/notificationDispatchService");

exports.listCoachHealConsultancyTracksController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub || req.user?.id;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadHealUser(userId);
  await assertStaffCanAccessUser(req, user);

  const { page, limit } = readPagination(req);
  const status = req.query.status || req.query.consultancyStatus || null;
  const result = await listHealConsultancyTracksByUserId(userId, { page, limit, status });
  const active = await findActiveHealConsultancyTrackByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Consultancy tracks fetched",
    data: {
      tracks: result.items.map(toPublicHealConsultancyTrack),
      activeTrack: toPublicHealConsultancyTrack(active),
      pagination: result.pagination,
    },
  });
});

exports.createCoachHealConsultancyTrackController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub || req.user?.id;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadHealUser(userId);
  await assertStaffCanAccessUser(req, user);

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
  await assertStaffCanAccessUser(req, user);
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
  await assertStaffCanAccessUser(req, user);
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

exports.offerCoachHealConsultancyPeriodsController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub || req.user?.id;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const trackId = String(req.params.trackId || "").trim();
  const user = await loadHealUser(userId);
  await assertStaffCanAccessUser(req, user);
  const track = await loadTrackForUser(trackId, userId);

  if (track.status !== "requested" && track.status !== "periods_offered") {
    throw new AppError("Availability can only be offered on an open request", 400);
  }

  const { offers, coachNotes } = parseOfferPeriodsBody(req.body || {});
  const updates = {
    status: "periods_offered",
    periodOffers: offers,
    selectedOfferId: null,
    selectedPeriod: null,
    selectedDate: null,
    statusUpdatedByRole: req.auth?.role || "wellness_coach",
    statusUpdatedById: coachId,
  };
  if (coachNotes !== undefined) updates.coachNotes = coachNotes;

  let updated;
  try {
    updated = await updateHealConsultancyTrack(trackId, updates);
  } catch (err) {
    handleValidationError(err);
  }

  dispatchCounsellingPeriodsOfferedNotificationAsync({
    userId,
    trackId,
  });

  return res.status(200).json({
    status: true,
    message: "Availability shared with client",
    data: { track: toPublicHealConsultancyTrack(updated) },
  });
});

exports.confirmCoachHealConsultancyTimeController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub || req.user?.id;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const trackId = String(req.params.trackId || "").trim();
  const user = await loadHealUser(userId);
  await assertStaffCanAccessUser(req, user);
  const track = await loadTrackForUser(trackId, userId);

  if (track.status !== "period_selected") {
    throw new AppError("A time period must be selected before confirming a fixed time", 400);
  }
  if (!track.selectedDate || !track.selectedPeriod) {
    throw new AppError("Selected period is missing on this request", 400);
  }

  const { scheduledAt, durationMinutes } = parseConfirmTimeBody(req.body || {});
  if (!isScheduledAtInWindow(scheduledAt, track.selectedDate, track.selectedPeriod, durationMinutes)) {
    throw new AppError("scheduledAt must fall within the selected time period", 400);
  }

  let zoom;
  try {
    zoom = await createZoomForMeeting({
      stepKey: "counselling",
      userName: user?.name,
      startAt: scheduledAt,
      durationMinutes,
    });
  } catch (err) {
    throw new AppError(err.message || "Failed to create Zoom meeting", 502);
  }

  let updated;
  try {
    updated = await updateHealConsultancyTrack(trackId, {
      status: "scheduled",
      scheduledAt,
      durationMinutes,
      meetingLink: zoom.zoomJoinUrl,
      zoomMeetingId: zoom.zoomMeetingId,
      zoomJoinUrl: zoom.zoomJoinUrl,
      zoomStartUrl: zoom.zoomStartUrl,
      confirmedAt: new Date().toISOString(),
      statusUpdatedByRole: req.auth?.role || "wellness_coach",
      statusUpdatedById: coachId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  dispatchCounsellingScheduledNotificationAsync({
    userId,
    trackId,
  });

  return res.status(200).json({
    status: true,
    message: "Counselling time confirmed",
    data: { track: toPublicHealConsultancyTrack(updated) },
  });
});

