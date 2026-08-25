const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById } = require("../../models/userModel");
const {
  isScheduleStepKey,
  normalizeRequestedSlots,
  mirrorRequestedSlots,
  toUserFacingMeeting,
  getOnboardingMeetingById,
  updateOnboardingMeeting,
  getActiveMeetingForStep,
  listMeetingsByStepForUser,
} = require("../../models/onboardingMeetingModel");
const { durationFromRange, createZoomForMeeting } = require("../../services/onboardingMeetingService");
const {
  dispatchOnboardingMeetingConfirmedNotificationAsync,
  dispatchOnboardingTimeRequestedCoachNotificationAsync,
} = require("../../services/notificationDispatchService");

function authedUserId(req) {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);
  return userId;
}

function readMeetingId(req) {
  const id = String(req.params.meetingId || req.params.id || "").trim();
  if (!id) throw new AppError("meetingId is required", 400);
  return id;
}

async function loadOwnMeeting(req) {
  const userId = authedUserId(req);
  const meeting = await getOnboardingMeetingById(readMeetingId(req));
  if (!meeting || String(meeting.userId) !== String(userId)) {
    throw new AppError("Meeting not found", 404);
  }
  return { userId, meeting };
}

exports.listUserOnboardingMeetingsController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const stepKey = String(req.query.stepKey || "").trim();
  if (stepKey) {
    if (!isScheduleStepKey(stepKey)) {
      throw new AppError("Invalid stepKey", 400);
    }
    const meeting = await getActiveMeetingForStep(userId, stepKey);
    return res.status(200).json({
      status: true,
      message: "Onboarding meeting fetched",
      meeting: toUserFacingMeeting(meeting),
    });
  }
  const meetingsByStep = await listMeetingsByStepForUser(userId);
  return res.status(200).json({
    status: true,
    message: "Onboarding meetings fetched",
    meetingsByStep,
  });
});

exports.bookUserOnboardingMeetingController = asyncHandler(async (req, res) => {
  const { userId, meeting } = await loadOwnMeeting(req);
  if (meeting.status !== "slots_offered") {
    throw new AppError("This meeting is not open for booking", 400);
  }
  const slotId = String(req.body?.slotId || "").trim();
  const slot = (meeting.slots || []).find((s) => String(s.id) === slotId);
  if (!slot) throw new AppError("slotId is not one of the offered slots", 400);

  const user = await getUserById(userId);
  const durationMinutes = durationFromRange(slot.startAt, slot.endAt, meeting.durationMinutes);
  let zoom;
  try {
    zoom = await createZoomForMeeting({
      stepKey: meeting.stepKey,
      userName: user?.name,
      startAt: slot.startAt,
      durationMinutes,
    });
  } catch (err) {
    throw new AppError(err.message || "Failed to create Zoom meeting", 502);
  }

  const updated = await updateOnboardingMeeting(meeting.id, {
    status: "confirmed",
    selectedSlotId: slot.id,
    confirmedAt: new Date().toISOString(),
    durationMinutes,
    ...mirrorRequestedSlots([]),
    ...zoom,
  });

  dispatchOnboardingMeetingConfirmedNotificationAsync({
    userId,
    stepKey: meeting.stepKey,
  });

  return res.status(200).json({
    status: true,
    message: "Meeting booked",
    meeting: toUserFacingMeeting(updated),
  });
});

exports.requestUserOnboardingMeetingTimeController = asyncHandler(async (req, res) => {
  const { userId, meeting } = await loadOwnMeeting(req);
  if (meeting.status !== "slots_offered" && meeting.status !== "time_requested") {
    throw new AppError("This meeting is not open for a time request", 400);
  }

  let requestedSlots;
  try {
    requestedSlots = normalizeRequestedSlots(req.body?.slots || req.body?.requestedSlots, {
      startAt: req.body?.startAt || req.body?.requestedStartAt,
      endAt: req.body?.endAt || req.body?.requestedEndAt,
    });
  } catch (err) {
    throw new AppError(err.message, 400);
  }

  const updated = await updateOnboardingMeeting(meeting.id, {
    status: "time_requested",
    ...mirrorRequestedSlots(requestedSlots),
    selectedSlotId: null,
  });

  const user = await getUserById(userId);
  dispatchOnboardingTimeRequestedCoachNotificationAsync({
    user,
    stepKey: meeting.stepKey,
  });

  return res.status(200).json({
    status: true,
    message: "Time request sent to your coach",
    meeting: toUserFacingMeeting(updated),
  });
});
