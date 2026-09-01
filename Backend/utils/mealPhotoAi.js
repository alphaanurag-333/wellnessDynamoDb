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
      items: [{
        name: "food name with portion (e.g. 3 Rotis/Chapatis or Meat curry (~150 g))",
        quantityGm: 0,
        proteinGm: 0,
        fatsGm: 0,
        carbsGm: 0,
        caloriesKcal: 0,
      }],
    }),
    "Rules:",
    "- related must be a boolean.",
    "- If related is false, all macros must be 0 and items must be [].",
    "- Macros must be non-negative numbers.",
    "- items can be empty; each item needs a name.",
    "- Each item must include estimated proteinGm, fatsGm, carbsGm, and caloriesKcal for its portion.",
    "- Item-level macros should sum approximately to the meal totals.",
    "- Include portion size in the item name when helpful (count or grams).",
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
      const name = String(item?.name || "").trim().slice(0, 120);
      if (!name) return null;
      const proteinGm = normalizeMacro(item?.proteinGm ?? item?.protein);
      const fatsGm = normalizeMacro(item?.fatsGm ?? item?.fat ?? item?.fats);
      const carbsGm = normalizeMacro(item?.carbsGm ?? item?.carbs);
      let caloriesKcal = normalizeMacro(item?.caloriesKcal ?? item?.calories);
      if (!caloriesKcal && (proteinGm || fatsGm || carbsGm)) {
        caloriesKcal = Math.round(proteinGm * 4 + carbsGm * 4 + fatsGm * 9);
      }
      return {
        name,
        quantityGm: normalizeMacro(item?.quantityGm),
        proteinGm,
        fatsGm,
        carbsGm,
        caloriesKcal,
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function distributeMealMacrosToItems(items, mealMacros) {
  if (!items.length) return items;
  const hasItemMacros = items.some(
    (item) => item.proteinGm || item.fatsGm || item.carbsGm || item.caloriesKcal
  );
  if (hasItemMacros) return items;

  const totalQty = items.reduce((sum, item) => sum + (Number(item.quantityGm) || 0), 0);
  const weight = totalQty > 0
    ? items.map((item) => (Number(item.quantityGm) || 0) / totalQty)
    : items.map(() => 1 / items.length);

  return items.map((item, index) => {
    const share = weight[index] || 0;
    const proteinGm = normalizeMacro(mealMacros.proteinGm * share);
    const fatsGm = normalizeMacro(mealMacros.fatsGm * share);
    const carbsGm = normalizeMacro(mealMacros.carbsGm * share);
    let caloriesKcal = normalizeMacro(mealMacros.caloriesKcal * share);
    if (!caloriesKcal && (proteinGm || fatsGm || carbsGm)) {
      caloriesKcal = Math.round(proteinGm * 4 + carbsGm * 4 + fatsGm * 9);
    }
    return { ...item, proteinGm, fatsGm, carbsGm, caloriesKcal };
  });
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

  const items = distributeMealMacrosToItems(
    normalizeItems(parsed?.items),
    { proteinGm, fatsGm, carbsGm, caloriesKcal }
  );

  return {
    related: true,
    message: message || "Meal photo analysed. Review the estimated macros before saving.",
    proteinGm,
    fatsGm,
    carbsGm,
    caloriesKcal,
    description: String(parsed?.description || message || "").trim().slice(0, 1000) || null,
    items,
  };
}

module.exports = {
  ZERO_MACROS,
  UNRELATED_MESSAGE,
  buildMealPhotoAiPrompt,
  normalizeMealPhotoAi,
};
