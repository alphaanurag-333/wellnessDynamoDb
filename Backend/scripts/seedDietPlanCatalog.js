require("dotenv").config();

const {
  createDietPlanCatalog,
  getDietPlanCatalogByPlanId,
} = require("../models/dietPlanCatalogModel");

const PLANS = [
  {
    planId: "vegetarian-weight-loss",
    name: "Vegetarian Weight Loss Plan",
    type: "VEGETARIAN",
    category: "Weight Loss",
    description: "Balanced vegetarian meals for steady fat loss with adequate protein.",
    status: "active",
    sequence: 1,
    meals: [
      { mealId: "veg-breakfast", day: "all", slot: "breakfast", title: "Oats & nuts bowl", foods: "Rolled oats, almonds, banana, skim milk", calories: 320, sequence: 1 },
      { mealId: "veg-lunch", day: "all", slot: "lunch", title: "Dal + brown rice + salad", foods: "Moong dal, brown rice, mixed veg salad", calories: 480, sequence: 2 },
      { mealId: "veg-dinner", day: "all", slot: "dinner", title: "Paneer stir fry", foods: "Paneer, bell peppers, olive oil, roti", calories: 420, sequence: 3 },
    ],
  },
  {
    planId: "keto-low-carb",
    name: "Keto Low-Carb Plan",
    type: "KETO",
    category: "Weight Loss",
    description: "High-fat, low-carb meals to support ketosis.",
    status: "active",
    sequence: 2,
    meals: [
      { mealId: "keto-breakfast", day: "all", slot: "breakfast", title: "Eggs & avocado", foods: "2 eggs, half avocado, spinach", calories: 380, sequence: 1 },
      { mealId: "keto-lunch", day: "all", slot: "lunch", title: "Grilled chicken salad", foods: "Chicken breast, lettuce, olive oil dressing", calories: 450, sequence: 2 },
      { mealId: "keto-snack", day: "all", slot: "snack", title: "Nuts mix", foods: "Almonds, walnuts (30g)", calories: 180, sequence: 3 },
    ],
  },
  {
    planId: "diabetic-balanced",
    name: "Diabetic Balanced Plan",
    type: "DIABETIC",
    category: "Medical",
    description: "Low glycemic index meals with controlled portions.",
    status: "active",
    sequence: 3,
    meals: [
      { mealId: "dia-breakfast", day: "all", slot: "breakfast", title: "Vegetable upma", foods: "Semolina, mixed vegetables, minimal oil", calories: 300, sequence: 1 },
      { mealId: "dia-lunch", day: "all", slot: "lunch", title: "Fish curry + millet roti", foods: "Grilled fish, millet roti, cucumber salad", calories: 460, sequence: 2 },
      { mealId: "dia-dinner", day: "all", slot: "dinner", title: "Lentil soup", foods: "Mixed lentils, vegetables, whole grain bread", calories: 350, sequence: 3 },
    ],
  },
  {
    planId: "non-veg-muscle",
    name: "Non-Veg Muscle Gain Plan",
    type: "NON_VEG",
    category: "Muscle Gain",
    description: "High-protein non-vegetarian plan for lean muscle building.",
    status: "active",
    sequence: 4,
    meals: [
      { mealId: "nv-breakfast", day: "all", slot: "breakfast", title: "Egg white omelette", foods: "4 egg whites, veggies, whole wheat toast", calories: 340, sequence: 1 },
      { mealId: "nv-lunch", day: "all", slot: "lunch", title: "Chicken breast meal", foods: "Grilled chicken, quinoa, broccoli", calories: 520, sequence: 2 },
      { mealId: "nv-dinner", day: "all", slot: "dinner", title: "Fish & sweet potato", foods: "Baked fish, sweet potato, greens", calories: 480, sequence: 3 },
    ],
  },
  {
    planId: "vegan-plant-based",
    name: "Vegan Plant-Based Plan",
    type: "VEGAN",
    category: "Balanced",
    description: "100% plant-based meals with complete nutrition.",
    status: "active",
    sequence: 5,
    meals: [
      { mealId: "vegan-breakfast", day: "all", slot: "breakfast", title: "Smoothie bowl", foods: "Soy milk, berries, chia seeds, granola", calories: 310, sequence: 1 },
      { mealId: "vegan-lunch", day: "all", slot: "lunch", title: "Chickpea Buddha bowl", foods: "Chickpeas, quinoa, tahini, roasted veggies", calories: 490, sequence: 2 },
      { mealId: "vegan-dinner", day: "all", slot: "dinner", title: "Tofu stir fry", foods: "Tofu, brown rice, Asian greens", calories: 430, sequence: 3 },
    ],
  },
  {
    planId: "gluten-free-general",
    name: "Gluten-Free General Plan",
    type: "GLUTEN_FREE",
    category: "Balanced",
    description: "Gluten-free whole foods for everyday wellness.",
    status: "active",
    sequence: 6,
    meals: [
      { mealId: "gf-breakfast", day: "all", slot: "breakfast", title: "Fruit & yogurt parfait", foods: "Greek yogurt, fruits, seeds (GF)", calories: 290, sequence: 1 },
      { mealId: "gf-lunch", day: "all", slot: "lunch", title: "Rice & grilled veggies", foods: "Basmati rice, grilled vegetables, olive oil", calories: 440, sequence: 2 },
    ],
  },
  {
    planId: "general-maintenance",
    name: "General Maintenance Plan",
    type: "GENERAL",
    category: "Balanced",
    description: "Flexible balanced diet for healthy weight maintenance.",
    status: "inactive",
    sequence: 7,
    meals: [
      { mealId: "gen-breakfast", day: "all", slot: "breakfast", title: "Poha", foods: "Flattened rice, peanuts, vegetables", calories: 300, sequence: 1 },
      { mealId: "gen-lunch", day: "all", slot: "lunch", title: "Thali style lunch", foods: "Roti, dal, sabzi, curd", calories: 500, sequence: 2 },
    ],
  },
];

async function main() {
  console.log("Seeding DietPlanCatalog...\n");
  let created = 0;
  let skipped = 0;

  for (const plan of PLANS) {
    const existing = await getDietPlanCatalogByPlanId(plan.planId);
    if (existing) {
      console.log(`  - skipped (exists): ${plan.name}`);
      skipped++;
      continue;
    }

    await createDietPlanCatalog({
      ...plan,
      createdBy: "seed-script",
    });
    console.log(`  ✓ ${plan.name}`);
    created++;
  }

  console.log(`\nDietPlanCatalog: ${created} created, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});
