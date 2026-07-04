export const LIST_LIMIT = 10;
export const LIST_SEARCH_MAX_LEN = 50;
export const NAME_MIN_LEN = 2;
export const NAME_MAX_LEN = 200;
export const CATEGORY_MIN_LEN = 2;
export const CATEGORY_MAX_LEN = 100;
export const PLAN_ID_MAX_LEN = 80;
export const DESCRIPTION_MAX_LEN = 2000;
export const MEAL_TITLE_MAX_LEN = 120;
export const MEAL_FOODS_MAX_LEN = 500;
export const MEAL_NOTES_MAX_LEN = 300;
export const MAX_MEALS = 50;

export const TYPE_OPTIONS = [
  { value: "VEGETARIAN", label: "Vegetarian" },
  { value: "VEGAN", label: "Vegan" },
  { value: "NON_VEG", label: "Non-vegetarian" },
  { value: "KETO", label: "Keto" },
  { value: "DIABETIC", label: "Diabetic" },
  { value: "GLUTEN_FREE", label: "Gluten-free" },
  { value: "GENERAL", label: "General" },
];

export const SLOT_OPTIONS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

export function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function typeLabel(value) {
  return TYPE_OPTIONS.find((o) => o.value === value)?.label || value || "—";
}

export function slotLabel(value) {
  return SLOT_OPTIONS.find((o) => o.value === value)?.label || value || "—";
}

export function sanitizeName(value) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, NAME_MAX_LEN);
}

export function sanitizeCategory(value) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, CATEGORY_MAX_LEN);
}

export function sanitizeDescription(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").slice(0, DESCRIPTION_MAX_LEN);
}

export function sanitizeSequence(value) {
  return String(value ?? "").replace(/[^\d]/g, "").slice(0, 6);
}

export function emptyMeal(sequence = 1) {
  return { mealId: "", day: "all", slot: "breakfast", title: "", foods: "", notes: "", calories: "", sequence };
}

export function emptyForm() {
  return {
    name: "",
    planId: "",
    type: "GENERAL",
    category: "",
    description: "",
    status: "active",
    sequence: "0",
    meals: [emptyMeal(1)],
  };
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function validateForm(form) {
  const name = String(form.name || "").trim();
  const category = String(form.category || "").trim();
  const planId = slugify(form.planId || name);
  const type = String(form.type || "GENERAL").toUpperCase();
  const status = String(form.status || "active").toLowerCase();
  const description = String(form.description || "").trim();
  const sequenceRaw = String(form.sequence ?? "0").trim();
  const meals = Array.isArray(form.meals) ? form.meals : [];

  if (!name) return "Plan name is required.";
  if (name.length < NAME_MIN_LEN) return `Plan name must be at least ${NAME_MIN_LEN} characters.`;
  if (name.length > NAME_MAX_LEN) return `Plan name cannot exceed ${NAME_MAX_LEN} characters.`;
  if (!category) return "Category is required.";
  if (category.length < CATEGORY_MIN_LEN) return `Category must be at least ${CATEGORY_MIN_LEN} characters.`;
  if (category.length > CATEGORY_MAX_LEN) return `Category cannot exceed ${CATEGORY_MAX_LEN} characters.`;
  if (!planId) return "Plan ID is required.";
  if (planId.length > PLAN_ID_MAX_LEN) return `Plan ID cannot exceed ${PLAN_ID_MAX_LEN} characters.`;
  if (!TYPE_OPTIONS.some((o) => o.value === type)) return "Invalid diet type.";
  if (status !== "active" && status !== "inactive") return "Status must be active or inactive.";
  if (description.length > DESCRIPTION_MAX_LEN) return `Description cannot exceed ${DESCRIPTION_MAX_LEN} characters.`;
  if (sequenceRaw === "" || !/^\d+$/.test(sequenceRaw)) return "Sequence must be a non-negative whole number.";
  if (!meals.length) return "At least one meal is required.";
  if (meals.length > MAX_MEALS) return `Cannot exceed ${MAX_MEALS} meals.`;

  const seenMealIds = new Set();
  for (let i = 0; i < meals.length; i += 1) {
    const m = meals[i];
    const title = String(m.title || "").trim();
    const mealId = slugify(m.mealId || title);
    if (!title) return `Meal ${i + 1}: title is required.`;
    if (title.length > MEAL_TITLE_MAX_LEN) {
      return `Meal ${i + 1}: title cannot exceed ${MEAL_TITLE_MAX_LEN} characters.`;
    }
    if (!mealId) return `Meal ${i + 1}: meal ID is required.`;
    if (mealId.length > PLAN_ID_MAX_LEN) {
      return `Meal ${i + 1}: meal ID cannot exceed ${PLAN_ID_MAX_LEN} characters.`;
    }
    if (seenMealIds.has(mealId)) return `Meal ${i + 1}: duplicate meal ID "${mealId}".`;
    seenMealIds.add(mealId);
    const foods = String(m.foods || "").trim();
    const notes = String(m.notes || "").trim();
    if (foods.length > MEAL_FOODS_MAX_LEN) {
      return `Meal ${i + 1}: foods cannot exceed ${MEAL_FOODS_MAX_LEN} characters.`;
    }
    if (notes.length > MEAL_NOTES_MAX_LEN) {
      return `Meal ${i + 1}: notes cannot exceed ${MEAL_NOTES_MAX_LEN} characters.`;
    }
    const calories = String(m.calories ?? "").trim();
    if (calories && (!/^\d+$/.test(calories) || Number(calories) < 0)) {
      return `Meal ${i + 1}: calories must be a non-negative number.`;
    }
  }

  return "";
}

export function toPayload(form) {
  return {
    name: String(form.name || "").trim(),
    planId: slugify(form.planId || form.name),
    type: form.type || "GENERAL",
    category: String(form.category || "").trim(),
    description: String(form.description || "").trim(),
    status: form.status || "active",
    sequence: Number(form.sequence) || 0,
    meals: (form.meals || []).map((m, index) => ({
      mealId: slugify(m.mealId || m.title),
      day: String(m.day || "all").trim() || "all",
      slot: m.slot || "breakfast",
      title: String(m.title || "").trim(),
      foods: String(m.foods || "").trim(),
      notes: String(m.notes || "").trim(),
      calories: m.calories === "" || m.calories == null ? null : Number(m.calories),
      sequence: Number(m.sequence) || index + 1,
    })),
  };
}

export function formFromPlan(plan) {
  if (!plan) return emptyForm();
  return {
    name: plan.name || "",
    planId: plan.planId || "",
    type: plan.type || "GENERAL",
    category: plan.category || "",
    description: plan.description || "",
    status: plan.status || "active",
    sequence: plan.sequence != null ? String(plan.sequence) : "0",
    meals:
      Array.isArray(plan.meals) && plan.meals.length
        ? plan.meals.map((m, index) => ({
            mealId: m.mealId || "",
            day: m.day || "all",
            slot: m.slot || "breakfast",
            title: m.title || "",
            foods: m.foods || "",
            notes: m.notes || "",
            calories: m.calories != null ? String(m.calories) : "",
            sequence: m.sequence ?? index + 1,
          }))
        : [emptyMeal(1)],
  };
}
