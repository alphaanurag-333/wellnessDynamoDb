const { getUserById, updateUser } = require("../models/userModel");
const {
  listCoachAssignedWellnessPrescriptionsByUserId,
  getLatestActiveReviewAt,
  getReviewAt,
  toCoachAssignedWellnessPrescriptionPublic,
} = require("../models/coachAssignedWellnessPrescriptionModel");

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

function coachMeetingsFromAssignments(assignments) {
  return (Array.isArray(assignments) ? assignments : [])
    .map((row) => {
      const date = getReviewAt(row);
      if (!row || !date) return null;
      const reviewStatus = String(row.reviewStatus || "active").toLowerCase();
      return {
        id: row.id,
        date,
        reviewStatus,
        summary: row.summary || "",
        authorName: row.authorName || "",
        cancelled: reviewStatus === "cancelled",
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
  return {
    assignments,
    meetings: coachMeetingsFromAssignments(assignments),
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
};
