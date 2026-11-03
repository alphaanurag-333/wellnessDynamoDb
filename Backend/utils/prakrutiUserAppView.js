/**
 * Pure helpers: what the mobile app may read (published snapshot only).
 * Draft saves from admin must never flow through these helpers.
 */

function normalizeTextList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((t) => String(t || "").trim()).filter(Boolean);
}

/** Coach draft lists — Save writes here only (not app-visible legacy fields). */
function readDraftRecommendationTexts(record) {
  if (!record) return [];
  const draft = normalizeTextList(record.draftRecommendationTexts);
  if (draft.length) return draft;
  return normalizeTextList(record.recommendationTexts);
}

function readDraftAvoidTexts(record) {
  if (!record) return [];
  const draft = normalizeTextList(record.draftAvoidTexts);
  if (draft.length) return draft;
  return normalizeTextList(record.avoidTexts);
}

/** Admin/coach API responses expose draft edits under recommendationTexts / avoidTexts. */
function withAdminDraftGuideFields(record) {
  if (!record) return record;
  return {
    ...record,
    recommendationTexts: readDraftRecommendationTexts(record),
    avoidTexts: readDraftAvoidTexts(record),
  };
}

/** @returns {object|null} Row with only published fields, or null if never pushed. */
function publishedPrakrutiRow(record) {
  if (!record || !record.pushedAt) return null;
  return {
    id: record.id,
    userId: record.userId,
    coachId: record.coachId,
    prakrutiType: record.pushedPrakrutiType,
    thingToAvoidIds: record.pushedThingToAvoidIds,
    selectedQuestionIds: record.pushedSelectedQuestionIds,
    recommendationTexts: normalizeTextList(record.pushedRecommendationTexts),
    avoidTexts: normalizeTextList(record.pushedAvoidTexts),
    scores: record.pushedScores,
    createdByRole: record.createdByRole,
    createdById: record.createdById,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    pushedAt: record.pushedAt,
  };
}

function draftDiffersFromPublished(record) {
  if (!record?.pushedAt) return true;
  const pub = publishedPrakrutiRow(record);
  if (!pub) return true;
  const draftType = String(record.prakrutiType || "");
  const pubType = String(pub.prakrutiType || "");
  if (draftType !== pubType) return true;
  if (JSON.stringify(readDraftRecommendationTexts(record))
    !== JSON.stringify(normalizeTextList(pub.recommendationTexts))) {
    return true;
  }
  if (JSON.stringify(readDraftAvoidTexts(record))
    !== JSON.stringify(normalizeTextList(pub.avoidTexts))) {
    return true;
  }
  return false;
}

module.exports = {
  publishedPrakrutiRow,
  draftDiffersFromPublished,
  readDraftRecommendationTexts,
  readDraftAvoidTexts,
  withAdminDraftGuideFields,
  normalizeTextList,
};
