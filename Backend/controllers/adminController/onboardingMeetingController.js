const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { assertStaffCanMutate, resolveStaffActor, getStaffScopeCoachId } = require("../staffAccess");
const {
  readUserIdParam,
  loadTargetUser,
  assertStaffHealUserAccess,
} = require("../helpers/dietPlanControllerHelpers");
const {
  isScheduleStepKey,
  holdExpiresAtFrom,
  normalizeSlots,
  resolveRequestedSlots,
  mirrorRequestedSlots,
  toPublicOnboardingMeeting,
  createOnboardingMeeting,
  getOnboardingMeetingById,
  updateOnboardingMeeting,
  listOnboardingMeetingsByUserId,
  listOnboardingMeetingsByCoachId,
  getActiveMeetingForStep,
} = require("../../models/onboardingMeetingModel");
const { durationFromRange, createZoomForMeeting } = require("../../services/onboardingMeetingService");
const { getUserById } = require("../../models/userModel");
const {
  dispatchOnboardingSlotsOfferedNotificationAsync,
  dispatchOnboardingMeetingConfirmedNotificationAsync,
} = require("../../services/notificationDispatchService");

function handleMeetingError(err) {
  if (err?.name === "ValidationError") throw new AppError(err.message, 400);
  if (err?.name === "NotFoundError") throw new AppError(err.message, 404);
  throw err;
}

function readMeetingId(req) {
  const id = String(req.params.meetingId || req.params.id || "").trim();
  if (!id) throw new AppError("meetingId is required", 400);
  return id;
}

async function loadOwnedMeeting(req) {
  const { userId, user, actor } = await assertStaffHealUserAccess(req, { requireHealTier: true });
  const meeting = await getOnboardingMeetingById(readMeetingId(req));
  if (!meeting || String(meeting.userId) !== String(userId)) {
    throw new AppError("Meeting not found", 404);
  }
  return { userId, user, actor, meeting };
}

exports.listStaffOnboardingMeetingsController = asyncHandler(async (req, res) => {
  const { userId } = await assertStaffHealUserAccess(req, { requireHealTier: true });
  const stepKey = String(req.query.stepKey || "").trim() || undefined;
  const status = String(req.query.status || "").trim() || undefined;
  const data = await listOnboardingMeetingsByUserId(userId, {
    page: req.query.page,
    limit: req.query.limit,
    stepKey,
    status,
  });
  return res.status(200).json({
    status: true,
    message: "Onboarding meetings fetched",
    meetings: (data.items || []).map(toPublicOnboardingMeeting),
    pagination: data.pagination,
  });
});

exports.createStaffOnboardingMeetingController = asyncHandler(async (req, res) => {
  assertStaffCanMutate(req);
  const { userId, user, actor } = await assertStaffHealUserAccess(req, { requireHealTier: true });
  const stepKey = String(req.body?.stepKey || "").trim();
  if (!isScheduleStepKey(stepKey)) {
    throw new AppError("stepKey must be launch, reportsBriefing, hap, or programInitiation", 400);
  }

  let slots;
  try {
    slots = normalizeSlots(req.body?.slots);
  } catch (err) {
    handleMeetingError(err);
  }

  const existing = await getActiveMeetingForStep(userId, stepKey);
  if (existing?.status === "confirmed") {
    throw new AppError("A confirmed meeting already exists for this step. Cancel it first.", 409);
  }

  const hold = req.body?.hold || req.body?.holdExpires || "24 hours";
  const payload = {
    userId,
    stepKey,
    status: "slots_offered",
    slots,
    holdExpiresAt: holdExpiresAtFrom(hold),
    coachNote: req.body?.note || req.body?.coachNote || "",
    durationMinutes: Number(req.body?.durationMinutes) || 45,
    coachId: user.parentCoachId || actor.id,
    createdById: actor.id,
    createdByRole: actor.role,
    ...mirrorRequestedSlots([]),
    selectedSlotId: null,
  };

  let meeting;
  try {
    if (existing) {
      meeting = await updateOnboardingMeeting(existing.id, payload);
    } else {
      meeting = await createOnboardingMeeting(payload);
    }
  } catch (err) {
    handleMeetingError(err);
  }

  dispatchOnboardingSlotsOfferedNotificationAsync({ userId, stepKey, meetingId: meeting.id });

  return res.status(201).json({
    status: true,
    message: "Meeting slots sent",
    meeting: toPublicOnboardingMeeting(meeting),
  });
});

exports.acceptOnboardingMeetingRequestController = asyncHandler(async (req, res) => {
  assertStaffCanMutate(req);
  const { user, meeting } = await loadOwnedMeeting(req);
  if (meeting.status !== "time_requested") {
    throw new AppError("This meeting does not have a pending time request", 400);
  }

  const requestedSlots = resolveRequestedSlots(meeting);
  if (!requestedSlots.length) {
    throw new AppError("Requested time is missing", 400);
  }

  const requestedSlotId = String(req.body?.requestedSlotId || req.body?.slotId || "").trim();
  let chosen = requestedSlotId
    ? requestedSlots.find((s) => String(s.id) === requestedSlotId)
    : null;

  // Legacy single-request accept: if only one slot (or no id sent for a single legacy request), use it.
  if (!chosen && requestedSlots.length === 1 && !requestedSlotId) {
    chosen = requestedSlots[0];
  }

  // Match by startAt/endAt if provided without id
  if (!chosen && (req.body?.startAt || req.body?.requestedStartAt)) {
    const startAt = String(req.body?.startAt || req.body?.requestedStartAt || "").trim();
    const endAt = String(req.body?.endAt || req.body?.requestedEndAt || "").trim();
    chosen = requestedSlots.find(
      (s) =>
        String(s.startAt) === startAt &&
        (!endAt || String(s.endAt) === endAt),
    );
  }

  if (!chosen) {
    throw new AppError(
      requestedSlots.length > 1
        ? "requestedSlotId is required when multiple times were requested"
        : "Requested time is missing",
      400,
    );
  }

  const startAt = chosen.startAt;
  const endAt = chosen.endAt;
  const durationMinutes = durationFromRange(startAt, endAt, meeting.durationMinutes);
  let zoom;
  try {
    zoom = await createZoomForMeeting({
      stepKey: meeting.stepKey,
      userName: user.name,
      startAt,
      durationMinutes,
    });
  } catch (err) {
    throw new AppError(err.message || "Failed to create Zoom meeting", 502);
  }

  const updated = await updateOnboardingMeeting(meeting.id, {
    status: "confirmed",
    selectedSlotId: null,
    confirmedAt: new Date().toISOString(),
    durationMinutes,
    ...mirrorRequestedSlots([]),
    ...zoom,
  });

  dispatchOnboardingMeetingConfirmedNotificationAsync({
    userId: user.id,
    stepKey: meeting.stepKey,
  });

  return res.status(200).json({
    status: true,
    message: "Requested time accepted",
    meeting: toPublicOnboardingMeeting(updated),
  });
});

exports.rejectOnboardingMeetingRequestController = asyncHandler(async (req, res) => {
  assertStaffCanMutate(req);
  const { meeting } = await loadOwnedMeeting(req);
  if (meeting.status !== "time_requested") {
    throw new AppError("This meeting does not have a pending time request", 400);
  }

  const updated = await updateOnboardingMeeting(meeting.id, {
    status: "slots_offered",
    ...mirrorRequestedSlots([]),
    holdExpiresAt: holdExpiresAtFrom(req.body?.hold || "24 hours"),
  });

  return res.status(200).json({
    status: true,
    message: "Time request rejected. Existing slots remain available.",
    meeting: toPublicOnboardingMeeting(updated),
  });
});

async function withUserNames(meetings) {
  const ids = [...new Set((meetings || []).map((item) => item?.userId).filter(Boolean))];
  const names = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        const user = await getUserById(id);
        names[id] = user?.name || user?.fullName || "";
      } catch {
        names[id] = "";
      }
    }),
  );
  return (meetings || []).map((item) => ({
    ...toPublicOnboardingMeeting(item),
    userName: names[item.userId] || item.userId,
  }));
}

exports.listStaffCalendarOnboardingMeetingsController = asyncHandler(async (req, res) => {
  resolveStaffActor(req);
  const coachId = getStaffScopeCoachId(req) || resolveStaffActor(req).id;
  const status = String(req.query.status || "").trim() || undefined;
  const data = await listOnboardingMeetingsByCoachId(coachId, {
    page: req.query.page,
    limit: req.query.limit || 200,
    status,
  });
  return res.status(200).json({
    status: true,
    message: "Calendar meetings fetched",
    meetings: await withUserNames(data.items || []),
    pagination: data.pagination,
  });
});

exports.cancelStaffOnboardingMeetingController = asyncHandler(async (req, res) => {
  assertStaffCanMutate(req);
  const { meeting } = await loadOwnedMeeting(req);
  const updated = await updateOnboardingMeeting(meeting.id, { status: "cancelled" });
  return res.status(200).json({
    status: true,
    message: "Meeting cancelled",
    meeting: toPublicOnboardingMeeting(updated),
  });
});
