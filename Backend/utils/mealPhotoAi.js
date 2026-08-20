const ZERO_MACROS = {
  proteinGm: 0,
  fatsGm: 0,
  carbsGm: 0,
  caloriesKcal: 0,
};

const UNRELATED_MESSAGE =
  "This image does not appear to be a meal or food photo. Please upload a clear photo of the food that was eaten.";

function buildMealPhotoAiPrompt({ category, mealType, description } = {}) {
  const hints = [
    category ? `Logged category: ${category}` : "",
    mealType ? `Logged meal type: ${mealType}` : "",
    description ? `Client note: ${description}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "You are a nutrition coach assistant. Analyze the attached image.",
    "Decide if the image is related to food, a meal, a drink, a snack, or a nutrition label / food screenshot.",
    "If it is unrelated (people, landscapes, memes, documents, random objects, blank screens, etc.), decline it.",
    "If it is related, estimate macros for the portion shown. Prefer conservative, realistic adult serving estimates.",
    hints ? `Context from the log:\n${hints}` : "",
    "Return JSON only with this shape:",
    JSON.stringify({
      related: true,
      message: "short reason if unrelated, otherwise a one-line meal summary",
      proteinGm: 0,
      fatsGm: 0,
      carbsGm: 0,
      caloriesKcal: 0,
      description: "what the meal appears to be",
      items: [{ name: "food name", quantityGm: 0 }],
    }),
    "Rules:",
    "- related must be a boolean.",
    "- If related is false, all macros must be 0 and items must be [].",
    "- Macros must be non-negative numbers.",
    "- items can be empty; each item needs a name.",
    "- Keep message under 240 characters.",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeMacro(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function normalizeItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const name = String(item?.name || "").trim().slice(0, 80);
      if (!name) return null;
      return { name, quantityGm: normalizeMacro(item?.quantityGm) };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeMealPhotoAi(parsed) {
  const related = parsed?.related === true || parsed?.related === "true";
  const message = String(parsed?.message || parsed?.reason || "").trim().slice(0, 240);

  if (!related) {
    return {
      related: false,
      message: message || UNRELATED_MESSAGE,
      ...ZERO_MACROS,
      description: null,
      items: [],
    };
  }

  const proteinGm = normalizeMacro(parsed?.proteinGm ?? parsed?.protein);
  const fatsGm = normalizeMacro(parsed?.fatsGm ?? parsed?.fat ?? parsed?.fats);
  const carbsGm = normalizeMacro(parsed?.carbsGm ?? parsed?.carbs);
  let caloriesKcal = normalizeMacro(parsed?.caloriesKcal ?? parsed?.calories);

  if (!caloriesKcal && (proteinGm || fatsGm || carbsGm)) {
    caloriesKcal = Math.round(proteinGm * 4 + carbsGm * 4 + fatsGm * 9);
  }

  return {
    related: true,
    message: message || "Meal photo analysed. Review the estimated macros before saving.",
    proteinGm,
    fatsGm,
    carbsGm,
    caloriesKcal,
    description: String(parsed?.description || message || "").trim().slice(0, 1000) || null,
    items: normalizeItems(parsed?.items),
  };
}

module.exports = {
  ZERO_MACROS,
  UNRELATED_MESSAGE,
  buildMealPhotoAiPrompt,
  normalizeMealPhotoAi,
};
