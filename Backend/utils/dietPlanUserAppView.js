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

function buildUserDietPlansListPayload(assignments) {
  const list = (Array.isArray(assignments) ? assignments : [])
    .map(enrichDietPlanAssignmentForUserApp)
    .filter(Boolean);
  const recommended = list[0] || null;
  const personalisedSections = recommended?.personalisedSections || [];

  return {
    recommended,
    history: list.length > 1 ? list.slice(1) : [],
    assignments: list,
    assignment: recommended,
    personalisedSections,
  };
}

module.exports = {
  enrichDietPlanAssignmentForUserApp,
  buildUserDietPlansListPayload,
};
