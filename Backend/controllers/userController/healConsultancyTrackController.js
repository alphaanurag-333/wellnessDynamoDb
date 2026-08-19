const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createHealConsultancyTrack,
  listHealConsultancyTracksByUserId,
  findActiveHealConsultancyTrackByUserId,
  updateHealConsultancyTrack,
  toUserFacingHealConsultancyTrack,
} = require("../../models/userHealConsultancyTrackModel");
const {
  readPagination,
  parseCreateBody,
  parseSelectPeriodBody,
  resolveCoachHierarchy,
  handleValidationError,
  loadTrackForUser,
} = require("../helpers/healConsultancyTrackControllerHelpers");
const {
  dispatchCounsellingRequestedCoachNotificationAsync,
  dispatchCounsellingPeriodSelectedCoachNotificationAsync,
} = require("../../services/notificationDispatchService");

exports.createMyHealConsultancyTrackController = asyncHandler(async (req, res) => {
  const user = req.currentUser;
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const body = parseCreateBody(req.body || {});
  const hierarchy = resolveCoachHierarchy(user);

  const active = await findActiveHealConsultancyTrackByUserId(userId);
  if (active) {
    throw new AppError("You already have an active counselling request", 409);
  }

  let track;
  try {
    track = await createHealConsultancyTrack({
      userId,
      parentCoachId: hierarchy.parentCoachId,
      assignedCoachId: hierarchy.assignedCoachId,
      assignedCoachType: hierarchy.assignedCoachType,
      concern: body.concern,
      status: "requested",
    });
  } catch (err) {
    handleValidationError(err);
  }

  dispatchCounsellingRequestedCoachNotificationAsync({
    user,
    trackId: track.id,
  });

  return res.status(201).json({
    status: true,
    message: "Consultancy request created",
    data: { track: toUserFacingHealConsultancyTrack(track) },
  });
});

exports.listMyHealConsultancyTracksController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const { page, limit } = readPagination(req);
  const status = req.query.status || req.query.consultancyStatus || null;
  const result = await listHealConsultancyTracksByUserId(userId, { page, limit, status });
  const active = await findActiveHealConsultancyTrackByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Consultancy tracks fetched",
    data: {
      tracks: result.items.map(toUserFacingHealConsultancyTrack),
      activeTrack: toUserFacingHealConsultancyTrack(active),
      pagination: result.pagination,
    },
  });
});

exports.selectMyHealConsultancyPeriodController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const trackId = String(req.params.trackId || "").trim();
  if (!trackId) throw new AppError("trackId is required", 400);

  const track = await loadTrackForUser(trackId, userId);
  if (track.status !== "periods_offered") {
    throw new AppError("This request is not open for period selection", 400);
  }

  const { offerId } = parseSelectPeriodBody(req.body || {});
  const offer = (track.periodOffers || []).find((row) => String(row.id) === offerId);
  if (!offer) throw new AppError("offerId is not one of the offered periods", 400);

  let updated;
  try {
    updated = await updateHealConsultancyTrack(trackId, {
      status: "period_selected",
      selectedOfferId: offer.id,
      selectedPeriod: offer.period,
      selectedDate: offer.date,
    });
  } catch (err) {
    handleValidationError(err);
  }

  dispatchCounsellingPeriodSelectedCoachNotificationAsync({
    user: req.currentUser,
    trackId,
  });

  return res.status(200).json({
    status: true,
    message: "Time period selected",
    data: { track: toUserFacingHealConsultancyTrack(updated) },
  });
});
