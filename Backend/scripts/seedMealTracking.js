require("dotenv").config();

const { v4: uuidv4 } = require("uuid");
const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

// ──────────────── Heal users ────────────────
const HEAL_USERS = [
  {
    userId: "1a693686-67aa-4466-bd1d-1aaf5f272ec9",
    name: "Vishwas H",
    coachId: "5a588983-2f21-4cac-af43-b731e8b0dfd2",
    loggedById: "e84665ab-e6a8-408b-83f6-fbbd3d3918bb",
    loggedByRole: "assistant_wellness_coach",
  },
  {
    userId: "5b727322-afc0-4d4f-9548-51f95f20b208",
    name: "Anurag",
    coachId: "5a588983-2f21-4cac-af43-b731e8b0dfd2",
    loggedById: "5a588983-2f21-4cac-af43-b731e8b0dfd2",
    loggedByRole: "wellness_coach",
  },
  {
    userId: "81de32f2-072f-4a07-80ec-fef9200561c2",
    name: "Bikash",
    coachId: "600e27cf-6ceb-4ee8-a788-8b86a0d11e95",
    loggedById: "600e27cf-6ceb-4ee8-a788-8b86a0d11e95",
    loggedByRole: "wellness_coach",
  },
  {
    userId: "e98701c8-c04f-4ce5-bf77-f11ac627417b",
    name: "Banita",
    coachId: "5a588983-2f21-4cac-af43-b731e8b0dfd2",
    loggedById: "5a588983-2f21-4cac-af43-b731e8b0dfd2",
    loggedByRole: "wellness_coach",
  },
  {
    userId: "8a836f48-72e0-42c3-b25d-1e7ecfcc7df9",
    name: "Test User",
    coachId: "5a588983-2f21-4cac-af43-b731e8b0dfd2",
    loggedById: "5a588983-2f21-4cac-af43-b731e8b0dfd2",
    loggedByRole: "wellness_coach",
  },
];

// ──────────────── Date helpers ────────────────
function dateOnly(daysAgo) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoAt(daysAgo, hour, minute = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

// ──────────────── Meal templates ────────────────
const MEAL_PLANS = [
  // Breakfast - meal
  {
    category: "meal",
    mealType: "First",
    entryTime: "08:00",
    description: "Healthy morning meal",
    items: [
      { name: "Oats", quantityGm: 80 },
      { name: "Banana", quantityGm: 120 },
      { name: "Milk", quantityGm: 200 },
    ],
    proteinGm: 12,
    fatsGm: 6,
    carbsGm: 65,
    caloriesKcal: 360,
  },
  // Functional juice - morning
  {
    category: "functional_juice",
    mealType: "First",
    entryTime: "07:30",
    description: "Morning detox juice",
    items: [
      { name: "Amla", quantityGm: 50 },
      { name: "Ginger", quantityGm: 10 },
      { name: "Lemon", quantityGm: 30 },
      { name: "Turmeric", quantityGm: 5 },
    ],
    proteinGm: 1,
    fatsGm: 0,
    carbsGm: 12,
    caloriesKcal: 52,
  },
  // Lunch - meal
  {
    category: "meal",
    mealType: "Second",
    entryTime: "13:00",
    description: "Balanced lunch",
    items: [
      { name: "Rice", quantityGm: 150 },
      { name: "Dal", quantityGm: 100 },
      { name: "Sabzi", quantityGm: 100 },
      { name: "Curd", quantityGm: 80 },
    ],
    proteinGm: 18,
    fatsGm: 8,
    carbsGm: 85,
    caloriesKcal: 490,
  },
  // Salad - lunch
  {
    category: "salad",
    mealType: "Second",
    entryTime: "13:30",
    description: "Fresh vegetable salad",
    items: [
      { name: "Cucumber", quantityGm: 100 },
      { name: "Tomato", quantityGm: 80 },
      { name: "Onion", quantityGm: 30 },
      { name: "Lemon juice", quantityGm: 15 },
    ],
    proteinGm: 2,
    fatsGm: 1,
    carbsGm: 10,
    caloriesKcal: 55,
  },
  // Snack - afternoon
  {
    category: "snacks",
    mealType: "Snack",
    entryTime: "16:30",
    description: "Evening snack",
    items: [
      { name: "Roasted chana", quantityGm: 40 },
      { name: "Mixed seeds", quantityGm: 15 },
    ],
    proteinGm: 10,
    fatsGm: 5,
    carbsGm: 20,
    caloriesKcal: 165,
  },
  // Protein shake
  {
    category: "protein",
    mealType: "Post-workout",
    entryTime: "18:00",
    description: "Post workout protein",
    items: [
      { name: "Whey protein", quantityGm: 30 },
      { name: "Milk", quantityGm: 250 },
    ],
    proteinGm: 30,
    fatsGm: 4,
    carbsGm: 18,
    caloriesKcal: 228,
  },
  // Dinner
  {
    category: "meal",
    mealType: "Third",
    entryTime: "20:30",
    description: "Light dinner",
    items: [
      { name: "Chapati", quantityGm: 120 },
      { name: "Paneer sabzi", quantityGm: 150 },
      { name: "Salad", quantityGm: 80 },
    ],
    proteinGm: 22,
    fatsGm: 12,
    carbsGm: 55,
    caloriesKcal: 420,
  },
  // Beverage
  {
    category: "beverage",
    mealType: "First",
    entryTime: "09:00",
    description: "Herbal tea",
    items: [
      { name: "Green tea", quantityGm: 5 },
      { name: "Water", quantityGm: 200 },
    ],
    proteinGm: 0,
    fatsGm: 0,
    carbsGm: 1,
    caloriesKcal: 5,
  },
  // Heavy breakfast variant
  {
    category: "meal",
    mealType: "First",
    entryTime: "08:30",
    description: "High protein breakfast",
    items: [
      { name: "Eggs", quantityGm: 150 },
      { name: "Brown bread", quantityGm: 80 },
      { name: "Avocado", quantityGm: 60 },
    ],
    proteinGm: 20,
    fatsGm: 18,
    carbsGm: 40,
    caloriesKcal: 402,
  },
  // Fruit salad
  {
    category: "salad",
    mealType: "Snack",
    entryTime: "11:00",
    description: "Mid-morning fruit bowl",
    items: [
      { name: "Apple", quantityGm: 150 },
      { name: "Pomegranate", quantityGm: 80 },
      { name: "Chia seeds", quantityGm: 10 },
    ],
    proteinGm: 2,
    fatsGm: 2,
    carbsGm: 36,
    caloriesKcal: 170,
  },
];

// Per-day meal selection (different combos each day for variety)
const DAY_PLANS = [
  [0, 1, 2, 3, 4, 6],   // day 0 (today)
  [7, 1, 2, 9, 5, 6],   // day 1
  [0, 3, 2, 4, 6],      // day 2
  [8, 1, 2, 5, 6],      // day 3
  [0, 9, 2, 3, 4, 6],   // day 4
  [7, 1, 2, 5, 6],      // day 5
  [0, 3, 2, 9, 4, 6],   // day 6
];

// Slight per-user variation (+/- grams)
function jitter(value, range = 0.15) {
  const factor = 1 + (Math.random() * range * 2 - range);
  return Math.round(value * factor * 10) / 10;
}

async function seedUser(user) {
  const { userId, name, coachId, loggedById, loggedByRole } = user;
  let count = 0;

  for (let daysAgo = 0; daysAgo <= 6; daysAgo++) {
    const date = dateOnly(daysAgo);
    const planIndices = DAY_PLANS[daysAgo % DAY_PLANS.length];

    for (const idx of planIndices) {
      const template = MEAL_PLANS[idx];
      const now = isoAt(daysAgo, parseInt(template.entryTime.split(":")[0]), 0);

      const item = {
        id: uuidv4(),
        userId,
        coachId,
        date,
        entryTime: template.entryTime,
        category: template.category,
        mealType: template.mealType,
        description: template.description,
        items: template.items,
        photoKey: null,
        proteinGm: jitter(template.proteinGm),
        fatsGm: jitter(template.fatsGm),
        carbsGm: jitter(template.carbsGm),
        caloriesKcal: jitter(template.caloriesKcal),
        loggedByRole,
        loggedById,
        createdAt: now,
        updatedAt: now,
      };

      await docClient.send(
        new PutCommand({ TableName: "MealTracking", Item: item })
      );
      count++;
    }
  }

  console.log(`  ✓ ${name}: ${count} meal logs seeded (7 days)`);
}

async function main() {
  console.log("Seeding MealTracking data for all heal users...\n");
  for (const user of HEAL_USERS) {
    await seedUser(user);
  }
  console.log(`\nDone! ${HEAL_USERS.length} users seeded with 7-day meal data.`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});
