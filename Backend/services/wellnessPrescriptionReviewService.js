const { getUserById, updateUser } = require("../models/userModel");
const {
  listCoachAssignedWellnessPrescriptionsByUserId,
  getLatestActiveReviewAt,
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
  syncUserLastReviewedAt,
  resolveAuthorName,
};
