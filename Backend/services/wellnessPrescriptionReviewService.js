const { getUserById, updateUser } = require("../models/userModel");
const {
  listCoachAssignedWellnessPrescriptionsByUserId,
  getLatestActiveReviewAt,
  getReviewAt,
  toCoachAssignedWellnessPrescriptionPublic,
} = require("../models/coachAssignedWellnessPrescriptionModel");
const { listHealConsultancyTracksByUserId } = require("../models/userHealConsultancyTrackModel");

function calendarDayFrom(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function pickConsultancyTrackForReviewDay(reviewDay, tracks) {
  if (!reviewDay) return null;
  const list = Array.isArray(tracks) ? tracks : [];
  const matched = list.filter((track) => {
    if (calendarDayFrom(track?.scheduledAt) === reviewDay) return true;
    if (calendarDayFrom(track?.selectedDate) === reviewDay) return true;
    return false;
  });
  if (!matched.length) return null;
  return matched.sort((a, b) =>
    String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")),
  )[0];
}

function deriveReviewLifecycleDates(assignment, track) {
  const reviewDay = getReviewAt(assignment);
  const reviewStatus = String(assignment?.reviewStatus || "active").toLowerCase();
  const trackStatus = String(track?.status || "").toLowerCase();

  let scheduledAt = track?.scheduledAt || null;
  let completedAt = null;
  let cancelledAt = assignment?.cancelledAt || null;

  if (trackStatus === "scheduled" && track?.scheduledAt) {
    scheduledAt = track.scheduledAt;
  }
  if (trackStatus === "completed") {
    completedAt = track.updatedAt || track.scheduledAt || null;
    if (!scheduledAt && track.scheduledAt) scheduledAt = track.scheduledAt;
  }
  if (trackStatus === "cancelled" && !cancelledAt) {
    cancelledAt = track.updatedAt || null;
  }

  if (reviewStatus === "active" && reviewDay) {
    completedAt = completedAt || `${reviewDay}T00:00:00.000Z`;
  }
  if (reviewStatus === "cancelled" && assignment?.cancelledAt) {
    cancelledAt = assignment.cancelledAt;
  }

  return {
    scheduledAt,
    completedAt,
    cancelledAt,
    scheduledDate: calendarDayFrom(scheduledAt),
    completedDate: calendarDayFrom(completedAt) || (reviewStatus === "active" ? reviewDay : null),
    cancelledDate: calendarDayFrom(cancelledAt),
  };
}

function attachReviewLifecycleDates(assignment, tracks) {
  if (!assignment) return assignment;
  const reviewDay = getReviewAt(assignment);
  const track = pickConsultancyTrackForReviewDay(reviewDay, tracks);
  return {
    ...assignment,
    ...deriveReviewLifecycleDates(assignment, track),
  };
}

async function loadStaffNameMap(staffIds = []) {
  const uniqueIds = [...new Set(staffIds.map((id) => String(id || "").trim()).filter(Boolean))];
  const entries = await Promise.all(
    uniqueIds.map(async (id) => {
      const staff = await getUserById(id);
      return [id, String(staff?.name || "").trim()];
    }),
  );
  return new Map(entries);
}

function resolveAuthorName(assignment, targetUser, staffNameMap) {
  const role = String(assignment?.createdByRole || "wellness_coach").trim().toLowerCase();
  if (role === "admin") {
    return { authorName: "Admin", authorRole: "admin" };
  }

  const createdById = String(assignment?.createdById || "").trim();
  const staffName = createdById ? staffNameMap.get(createdById) : "";

  if (role === "assistant_wellness_coach") {
    const awcName =
      staffName ||
      String(targetUser?.assignedCoachType === "assistant_wellness_coach"
        ? targetUser?.assignedCoach?.name
        : "").trim() ||
      "Assistant coach";
    return { authorName: `${awcName} (AWC)`, authorRole: role };
  }

  const coachName =
    staffName ||
    String(targetUser?.assignedCoach?.name || "").trim() ||
    String(targetUser?.parentCoach?.name || "").trim() ||
    "Coach";
  return { authorName: coachName, authorRole: role };
}

async function enrichAssignmentsWithReviewMeta(assignments, targetUser) {
  const list = Array.isArray(assignments) ? assignments.filter(Boolean) : [];
  const staffNameMap = await loadStaffNameMap(list.map((row) => row.createdById));
  return list.map((row) => {
    const author = resolveAuthorName(row, targetUser, staffNameMap);
    return toCoachAssignedWellnessPrescriptionPublic(row, author);
  });
}

async function listEnrichedWellnessPrescriptionsForUser(userId, targetUser) {
  const assignments = await listCoachAssignedWellnessPrescriptionsByUserId(userId);
  return enrichAssignmentsWithReviewMeta(assignments, targetUser);
}

function coachMeetingsFromAssignments(assignments, tracks = []) {
  return (Array.isArray(assignments) ? assignments : [])
    .map((row) => {
      const date = getReviewAt(row);
      if (!row || !date) return null;
      const enriched = attachReviewLifecycleDates(row, tracks);
      const reviewStatus = String(row.reviewStatus || "active").toLowerCase();
      return {
        id: row.id,
        date,
        reviewStatus,
        summary: row.summary || "",
        authorName: row.authorName || "",
        cancelled: reviewStatus === "cancelled",
        scheduledDate: enriched.scheduledDate || null,
        completedDate: enriched.completedDate || null,
        cancelledDate: enriched.cancelledDate || null,
        scheduledAt: enriched.scheduledAt || null,
        completedAt: enriched.completedAt || null,
        cancelledAt: enriched.cancelledAt || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)));
}

async function loadCoachMeetingSnapshot(userId, targetUser) {
  const uid = String(userId || "").trim();
  if (!uid) return { assignments: [], meetings: [], lastReviewedAt: null };

  const user = targetUser || (await getUserById(uid));
  const assignments = await listEnrichedWellnessPrescriptionsForUser(uid, user);
  let tracks = [];
  try {
    const trackResult = await listHealConsultancyTracksByUserId(uid, { page: 1, limit: 200 });
    tracks = trackResult.items || [];
  } catch (err) {
    console.error("[wellness review] consultancy tracks failed", err?.message || err);
  }
  const assignmentsWithDates = assignments.map((row) => attachReviewLifecycleDates(row, tracks));
  return {
    assignments: assignmentsWithDates,
    meetings: coachMeetingsFromAssignments(assignmentsWithDates, tracks),
    lastReviewedAt: getLatestActiveReviewAt(assignments) || null,
  };
}

async function syncUserLastReviewedAt(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return null;

  const assignments = await listCoachAssignedWellnessPrescriptionsByUserId(uid);
  const lastReviewedAt = getLatestActiveReviewAt(assignments);
  await updateUser(uid, { lastReviewedAt: lastReviewedAt || null });
  return lastReviewedAt || null;
}

module.exports = {
  enrichAssignmentsWithReviewMeta,
  listEnrichedWellnessPrescriptionsForUser,
  loadCoachMeetingSnapshot,
  coachMeetingsFromAssignments,
  syncUserLastReviewedAt,
  resolveAuthorName,
  deriveReviewLifecycleDates,
  attachReviewLifecycleDates,
  calendarDayFrom,
};
