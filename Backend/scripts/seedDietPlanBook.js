require("dotenv").config();

const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { createDietPlanBook } = require("../models/dietPlanBookModel");

const PLANS = [
  {
    title: "Gut Reset · 7 day",
    content:
      "Start on an empty stomach with warm lemon water, then a light vegetable broth before noon. No dairy, wheat, sugar or packaged food for seven days. Herbal teas only after noon. Day four adds cooked moong dal and steamed vegetables. Resume normal meals on day eight.",
  },
  {
    title: "Diabetes friendly · low GI",
    content:
      "Three fixed meals, no snacking. Each plate is half non-starchy vegetables, a quarter protein and a quarter low-GI carbohydrate (millet, brown rice, whole dal). Fruit only with a fat or protein, never alone. Dinner two hours before bed, followed by a 15-minute walk. Fasting glucose logged every morning.",
  },
  {
    title: "PCOD balance",
    content:
      "Anti-inflammatory base: seasonal vegetables, cold-pressed oils and 1.2 g protein per kg body weight. Seed cycling through the cycle — flax and pumpkin in the follicular phase, sesame and sunflower in the luteal. Caffeine capped at one cup, sugar and refined flour removed. Strength work three times a week.",
  },
  {
    title: "Fat loss · high protein",
    content:
      "A 400-500 kcal deficit with protein at every meal — eggs, fish, paneer or dal. Vegetables fill half the plate. Carbs timed around training. Water 3 litres, no liquid calories. Weigh in weekly, not daily. One free meal on day seven if the week was logged honestly.",
  },
];

async function existingTitles() {
  const items = [];
  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: "DietPlanBook",
        ProjectionExpression: "id, title",
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...(Items || []));
    lastKey = LastEvaluatedKey;
  } while (lastKey);
  return new Set(items.map((item) => String(item.title || "").trim().toLowerCase()).filter(Boolean));
}

async function main() {
  console.log("Seeding DietPlanBook...\n");
  const existing = await existingTitles();
  let created = 0;
  let skipped = 0;

  for (const plan of PLANS) {
    const key = plan.title.trim().toLowerCase();
    if (existing.has(key)) {
      console.log(`  - skipped (exists): ${plan.title}`);
      skipped += 1;
      continue;
    }
    await createDietPlanBook({ title: plan.title, content: plan.content, status: "active" });
    console.log(`  ✓ ${plan.title}`);
    created += 1;
  }

  console.log(`\nDietPlanBook: ${created} created, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});
