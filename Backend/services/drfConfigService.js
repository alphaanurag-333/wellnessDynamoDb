const { listAllSectionsUnpaged } = require("../models/drfSectionModel");
const { listAllQuestionsUnpaged } = require("../models/drfSectionQuestionModel");

const TARGET_WEIGHT = 100;
const TARGET_SECTION_POINTS = 100;

function isLiveSection(section) {
  if (!section) return false;
  if (section.live === false) return false;
  if (String(section.status || "").toLowerCase() === "inactive") return false;
  return true;
}

function isEnabledQuestion(question) {
  if (!question) return false;
  if (question.enabled === false) return false;
  if (String(question.status || "").toLowerCase() === "inactive") return false;
  return true;
}

function weightTotal(sections = []) {
  return sections.reduce((sum, section) => {
    if (!isLiveSection(section)) return sum;
    return sum + (Number(section.weight) || 0);
  }, 0);
}

function remainingWeight(sections = [], { excludeId } = {}) {
  const filtered = excludeId
    ? sections.filter((section) => String(section.id) !== String(excludeId))
    : sections;
  return Math.max(0, TARGET_WEIGHT - weightTotal(filtered));
}

function sectionPointsTotal(section, { enabledOnly = true } = {}) {
  const questions = Array.isArray(section?.questions) ? section.questions : [];
  return questions.reduce((sum, question) => {
    if (enabledOnly && !isEnabledQuestion(question)) return sum;
    return sum + (Number(question.points) || 0);
  }, 0);
}

function remainingSectionPoints(section, { excludeId } = {}) {
  const used = (Array.isArray(section?.questions) ? section.questions : []).reduce((sum, question) => {
    if (!isEnabledQuestion(question)) return sum;
    if (excludeId && String(question.id) === String(excludeId)) return sum;
    return sum + (Number(question.points) || 0);
  }, 0);
  return Math.max(0, TARGET_SECTION_POINTS - used);
}

function liveQuestionCount(sections = []) {
  return sections.reduce((sum, section) => {
    const questions = Array.isArray(section.questions) ? section.questions : [];
    return sum + questions.filter(isEnabledQuestion).length;
  }, 0);
}

function totalQuestionCount(sections = []) {
  return sections.reduce((sum, section) => {
    const questions = Array.isArray(section.questions) ? section.questions : [];
    return sum + questions.length;
  }, 0);
}

async function loadNestedConfig() {
  const [sections, questions] = await Promise.all([
    listAllSectionsUnpaged(),
    listAllQuestionsUnpaged(),
  ]);
  const bySection = new Map();
  for (const question of questions) {
    const list = bySection.get(question.sectionId) || [];
    list.push(question);
    bySection.set(question.sectionId, list);
  }
  const nested = sections.map((section) => ({
    ...section,
    questions: bySection.get(section.id) || [],
  }));
  return {
    sections: nested,
    scoring: summarizeConfig(nested),
  };
}

function liveCatalogSections(sections = []) {
  return sections
    .filter(isLiveSection)
    .map((section) => ({
      ...section,
      questions: (Array.isArray(section.questions) ? section.questions : []).filter(isEnabledQuestion),
    }))
    .filter((section) => section.questions.length > 0);
}

function applyUserDrfSelection(sections = [], selectedQuestionIds, { saved = false } = {}) {
  const catalog = liveCatalogSections(sections);
  const catalogIds = new Set(catalog.flatMap((section) => section.questions.map((question) => String(question.id))));
  const requested = (Array.isArray(selectedQuestionIds) ? selectedQuestionIds : [])
    .map((id) => String(id))
    .filter((id) => catalogIds.has(id));
  const selected = new Set(saved ? requested : []);

  for (const section of catalog) {
    for (const question of section.questions) {
      if (question.fixed) selected.add(String(question.id));
    }
  }

  return catalog.map((section) => ({
    id: section.id,
    name: section.name,
    weight: Number(section.weight) || 0,
    fixed: Boolean(section.fixed),
    questions: section.questions.map((question) => ({
      id: question.id,
      name: question.name,
      points: Number(question.points) || 0,
      fixed: Boolean(question.fixed),
      selected: selected.has(String(question.id)),
    })),
  }));
}

function selectedQuestionIdsFromSections(sections = []) {
  return sections.flatMap((section) =>
    (Array.isArray(section.questions) ? section.questions : [])
      .filter((question) => question.selected || question.fixed)
      .map((question) => String(question.id)),
  );
}

function summarizeConfig(sections = []) {
  const allocated = weightTotal(sections);
  const hasLive = sections.some(isLiveSection);
  const sectionValidity = sections.map((section) => {
    const live = isLiveSection(section);
    const pointsTotal = sectionPointsTotal(section, { enabledOnly: true });
    return {
      id: section.id,
      name: section.name,
      weight: Number(section.weight) || 0,
      live,
      pointsTotal,
      pointsValid: !live || pointsTotal === TARGET_SECTION_POINTS,
    };
  });

  return {
    weightTotal: allocated,
    remainingWeight: Math.max(0, TARGET_WEIGHT - allocated),
    liveQuestionCount: liveQuestionCount(sections),
    totalQuestionCount: totalQuestionCount(sections),
    targetWeight: TARGET_WEIGHT,
    targetSectionPoints: TARGET_SECTION_POINTS,
    valid: {
      weights: !hasLive || allocated === TARGET_WEIGHT,
      sections: sectionValidity,
    },
  };
}

module.exports = {
  TARGET_WEIGHT,
  TARGET_SECTION_POINTS,
  isLiveSection,
  isEnabledQuestion,
  weightTotal,
  remainingWeight,
  sectionPointsTotal,
  remainingSectionPoints,
  liveQuestionCount,
  totalQuestionCount,
  summarizeConfig,
  loadNestedConfig,
  liveCatalogSections,
  applyUserDrfSelection,
  selectedQuestionIdsFromSections,
};
