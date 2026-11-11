const { isLegacyPublishedAssignment } = require("../models/coachAssignedDietPlanModel");

function wasPublishedToClientApp(row) {
  if (!row) return false;
  if (String(row.pushedAt || "").trim()) return true;
  return isLegacyPublishedAssignment(row);
}

function splitCoachDietPlanAssignmentsForAdmin(assignments) {
  const list = Array.isArray(assignments) ? assignments : [];
  const hasArchivedRows = list.some((row) => row?.archived === true);

  if (hasArchivedRows) {
    const active = list.find((row) => !row?.archived) || null;
    const history = list
      .filter((row) => row?.archived && wasPublishedToClientApp(row))
      .sort((a, b) => {
        const aTime = new Date(a?.pushedAt || a?.createdAt || 0).getTime();
        const bTime = new Date(b?.pushedAt || b?.createdAt || 0).getTime();
        return bTime - aTime;
      });
    return { active, history };
  }

  return {
    active: list[0] || null,
    history: list.slice(1).filter(wasPublishedToClientApp),
  };
}

module.exports = {
  splitCoachDietPlanAssignmentsForAdmin,
};
