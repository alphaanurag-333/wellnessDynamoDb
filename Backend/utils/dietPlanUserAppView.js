const { sectionsFromAssignment } = require("./personalisedDietPlan");

/**
 * Shape assigned diet plans for the mobile app (published snapshot only).
 */
function enrichDietPlanAssignmentForUserApp(assignment) {
  if (!assignment) return null;

  const personalisedSections = sectionsFromAssignment(assignment);
  const pdfUrl = String(
    assignment.pdfUrl
    || assignment.publishedPdfUrl
    || "",
  ).trim() || null;
  const pdfKey = String(
    assignment.pdfKey
    || assignment.publishedPdfKey
    || "",
  ).trim() || null;

  return {
    ...assignment,
    pdfUrl,
    pdfKey,
    personalisedSections,
    hasPersonalisedPlan: personalisedSections.length > 0,
  };
}

function buildUserDietPlansListPayload(recommended, history = []) {
  const active = recommended ? enrichDietPlanAssignmentForUserApp(recommended) : null;
  const historyList = (Array.isArray(history) ? history : [])
    .map(enrichDietPlanAssignmentForUserApp)
    .filter(Boolean);

  return {
    recommended: active,
    history: historyList,
    assignments: active ? [active, ...historyList] : historyList,
    assignment: active,
    personalisedSections: active?.personalisedSections || [],
  };
}

module.exports = {
  enrichDietPlanAssignmentForUserApp,
  buildUserDietPlansListPayload,
};
