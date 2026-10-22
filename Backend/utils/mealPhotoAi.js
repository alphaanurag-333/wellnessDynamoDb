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

function sumRoundedItemMacros(items) {
  return items.reduce(
    (acc, item) => ({
      proteinGm: acc.proteinGm + Math.round(Number(item.proteinGm) || 0),
      fatsGm: acc.fatsGm + Math.round(Number(item.fatsGm) || 0),
      carbsGm: acc.carbsGm + Math.round(Number(item.carbsGm) || 0),
      caloriesKcal: acc.caloriesKcal + Math.round(Number(item.caloriesKcal) || 0),
    }),
    { proteinGm: 0, fatsGm: 0, carbsGm: 0, caloriesKcal: 0 }
  );
}

function itemsHaveMacros(items) {
  return items.some(
    (item) => item.proteinGm || item.fatsGm || item.carbsGm || item.caloriesKcal
  );
}

function clientFoodItems(record) {
  return (Array.isArray(record?.items) ? record.items : [])
    .map((item) => ({
      name: String(item?.name || "").trim(),
      quantityGm: Number(item?.quantityGm) || 0,
    }))
    .filter((item) => item.name);
}

/** Detailed meals are calculated from the client's food list. Macro meals stay on the photo. */
function mealAiRoute(record) {
  const mode = String(record?.trackingMode || "").trim().toLowerCase();
  if (mode === "macro") return { source: "photo", items: [] };

  const items = clientFoodItems(record);
  const detailed = mode === "detailed_macro" || mode === "detailed";
  if (detailed) return { source: "items", items };

  const legacyDetailed = items.length > 0
    && record?.aiSource !== "photo"
    && String(record?.aiStatus || "none") !== "analysed";
  if (legacyDetailed) return { source: "items", items };

  return { source: "photo", items: [] };
}

function buildMealItemsAiPrompt(items = []) {
  const lines = items.map((item, index) => {
    const name = String(item?.name || "").trim();
    const qty = Number(item?.quantityGm);
    const amount = Number.isFinite(qty) ? qty : 0;
    return `${index + 1}. ${name} — quantity: ${amount}`;
  });

  return [
    "You are a nutrition coach. Calculate macros from each food name and the quantity the client typed.",
    "There is no photo. Do not estimate portions from an image or screenshot. Do not add foods. Do not remove foods. Do not change names or quantities.",
    "How to read the quantity the client entered:",
    "- Countable foods (egg, roti, chapati, banana, apple, bread slice, idli, dosa, paratha) with a quantity from 1 to 12 are a piece count. Egg with quantity 2 means 2 eggs, not 2 grams.",
    "- Any larger number is grams. Rice 100 means 100 g cooked rice. Chapati 150 means 150 g chapati, not 150 chapatis. Sabji 150 means 150 g of a typical home-style vegetable sabzi. Salad 100 means 100 g raw salad.",
    "Calculate calories, protein, carbs, and fat for that exact amount of each food. Use realistic commonly eaten values.",
    "Foods:",
    lines.join("\n"),
    "Return JSON only with this shape:",
    JSON.stringify({
      related: true,
      message: "one-line summary of the food list",
      proteinGm: 0,
      fatsGm: 0,
      carbsGm: 0,
      caloriesKcal: 0,
      description: "short description of these foods",
      items: [{
        name: "same name as the input row",
        quantityGm: 0,
        proteinGm: 0,
        fatsGm: 0,
        carbsGm: 0,
        caloriesKcal: 0,
      }],
    }),
    "Rules:",
    "- Return one item per input row, in the same order.",
    "- Copy each name and quantity exactly.",
    "- Each item's macros are for that row's quantity only.",
    "- Item macros should sum to the meal totals.",
    "- related must be true.",
    "- Macros must be non-negative numbers.",
  ].join("\n");
}

function normalizeMealItemsAi(parsed, sourceItems = []) {
  const aiItems = Array.isArray(parsed?.items) ? parsed.items : [];
  const items = sourceItems.map((source, index) => {
    const name = String(source?.name || "").trim();
    const quantityGm = normalizeMacro(source?.quantityGm);
    const ai = aiItems[index] && typeof aiItems[index] === "object" ? aiItems[index] : {};
    const proteinGm = normalizeMacro(ai?.proteinGm ?? ai?.protein);
    const fatsGm = normalizeMacro(ai?.fatsGm ?? ai?.fat ?? ai?.fats);
    const carbsGm = normalizeMacro(ai?.carbsGm ?? ai?.carbs);
    let caloriesKcal = normalizeMacro(ai?.caloriesKcal ?? ai?.calories);
    if (!caloriesKcal && (proteinGm || fatsGm || carbsGm)) {
      caloriesKcal = Math.round(proteinGm * 4 + carbsGm * 4 + fatsGm * 9);
    }
    return { name, quantityGm, proteinGm, fatsGm, carbsGm, caloriesKcal };
  }).filter((item) => item.name);

  const summed = sumRoundedItemMacros(items);
  const message = String(parsed?.message || "").trim().slice(0, 240)
    || "Macros calculated from the submitted food name and quantity.";

  return {
    related: true,
    message,
    proteinGm: summed.proteinGm,
    fatsGm: summed.fatsGm,
    carbsGm: summed.carbsGm,
    caloriesKcal: summed.caloriesKcal,
    description: String(parsed?.description || message).trim().slice(0, 1000) || null,
    items,
  };
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

  const normalizedItems = normalizeItems(parsed?.items);
  const suppliedItemMacros = itemsHaveMacros(normalizedItems);
  const items = distributeMealMacrosToItems(
    normalizedItems,
    { proteinGm, fatsGm, carbsGm, caloriesKcal }
  );
  const summed = suppliedItemMacros ? sumRoundedItemMacros(items) : null;

  return {
    related: true,
    message: message || "Meal photo analysed. Review the estimated macros before saving.",
    proteinGm: summed ? summed.proteinGm : proteinGm,
    fatsGm: summed ? summed.fatsGm : fatsGm,
    carbsGm: summed ? summed.carbsGm : carbsGm,
    caloriesKcal: summed ? summed.caloriesKcal : caloriesKcal,
    description: String(parsed?.description || message || "").trim().slice(0, 1000) || null,
    items,
  };
}

module.exports = {
  ZERO_MACROS,
  UNRELATED_MESSAGE,
  buildMealPhotoAiPrompt,
  buildMealItemsAiPrompt,
  clientFoodItems,
  mealAiRoute,
  normalizeMealPhotoAi,
  normalizeMealItemsAi,
};
