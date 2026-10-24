const PERSONALISED_PLAN_ID = "personalised-coach-plan";
const MAX_SECTIONS = 30;
const MAX_ROWS_PER_SECTION = 40;

function slugPart(value, fallback = "item") {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function normalizeRow(row, index = 0) {
  return {
    id: String(row?.id || `row-${index}`).trim() || `row-${index}`,
    label: String(row?.label || row?.title || "").trim() || `Option ${index + 1}`,
    description: String(row?.description || row?.foods || "").trim() || "—",
    quantity: String(row?.quantity || row?.notes || "").trim() || "—",
  };
}

function normalizeSection(section, index = 0) {
  const id = String(section?.id || `section-${index}`).trim() || `section-${index}`;
  const rows = (Array.isArray(section?.rows) ? section.rows : []).map(normalizeRow);
  return {
    id,
    title: String(section?.title || "").trim() || "New section",
    rows,
  };
}

function parseSections(raw) {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) {
    const err = new Error("At least one meal section is required");
    err.name = "ValidationError";
    throw err;
  }
  if (raw.length > MAX_SECTIONS) {
    const err = new Error(`A diet plan cannot have more than ${MAX_SECTIONS} sections`);
    err.name = "ValidationError";
    throw err;
  }
  return raw.map(normalizeSection).map((section) => {
    if (section.rows.length > MAX_ROWS_PER_SECTION) {
      const err = new Error(`Section "${section.title}" cannot have more than ${MAX_ROWS_PER_SECTION} rows`);
      err.name = "ValidationError";
      throw err;
    }
    return section;
  });
}

function sectionsToMeals(sections) {
  const meals = [];
  let sequence = 0;
  for (const section of sections) {
    for (const row of section.rows) {
      sequence += 1;
      meals.push({
        mealId: slugPart(`${section.id}-${row.id}`, `meal-${sequence}`),
        day: section.id,
        slot: "snack",
        sectionTitle: section.title,
        title: row.label,
        foods: row.description,
        notes: row.quantity,
        calories: null,
        sequence,
      });
    }
  }
  if (!meals.length) {
    const err = new Error("Add at least one row before saving the diet plan");
    err.name = "ValidationError";
    throw err;
  }
  return meals;
}

function mealsToSections(meals) {
  const grouped = new Map();
  const order = [];
  (Array.isArray(meals) ? meals : []).forEach((meal, index) => {
    const sectionId = String(meal?.day || meal?.sectionId || "section-default").trim() || "section-default";
    if (!grouped.has(sectionId)) {
      grouped.set(sectionId, {
        id: sectionId,
        title: String(meal?.sectionTitle || "").trim() || "Meals",
        rows: [],
        sequence: Number(meal?.sequence) || index,
      });
      order.push(sectionId);
    }
    const section = grouped.get(sectionId);
    if (meal?.sectionTitle && !section.title) {
      section.title = String(meal.sectionTitle).trim();
    }
    section.rows.push(normalizeRow({
      id: meal?.mealId || meal?.id || `row-${index}`,
      label: meal?.title,
      description: meal?.foods,
      quantity: meal?.notes,
    }, index));
    section.sequence = Math.min(section.sequence, Number(meal?.sequence) || index);
  });

  return order
    .map((id) => grouped.get(id))
    .filter(Boolean)
    .sort((a, b) => a.sequence - b.sequence)
    .map(({ id, title, rows }) => ({ id, title, rows }));
}

function buildPersonalisedPlanSnapshot(sections) {
  const parsed = parseSections(sections);
  return {
    planId: PERSONALISED_PLAN_ID,
    name: "Personalised diet plan",
    type: "GENERAL",
    category: "Coach customised",
    description: "Meal sections with client-choosable options and quantities",
    meals: sectionsToMeals(parsed),
  };
}

function sectionsFromAssignment(assignment) {
  const plans = Array.isArray(assignment?.plans) ? assignment.plans : [];
  const personalised = plans.find((plan) => String(plan?.planId || "") === PERSONALISED_PLAN_ID) || plans[0];
  if (!personalised?.meals?.length) return [];
  return mealsToSections(personalised.meals);
}

module.exports = {
  PERSONALISED_PLAN_ID,
  parseSections,
  sectionsToMeals,
  mealsToSections,
  buildPersonalisedPlanSnapshot,
  sectionsFromAssignment,
};
