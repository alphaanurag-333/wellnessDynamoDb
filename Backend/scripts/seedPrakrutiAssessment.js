require("dotenv").config();

const { v4: uuidv4 } = require("uuid");
const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

const QUESTION_TABLE = "PrakrutiQuestion";
const THING_TABLE = "PrakrutiThingToAvoid";
const RECOMMENDATION_TABLE = "PrakrutiRecommendation";

const QUESTIONS = [
  { sortOrder: 1, category: "Physical Build", question: "What is your natural body frame? (thin/light, medium, broad/heavy)" },
  { sortOrder: 2, category: "Physical Build", question: "Do you gain or lose weight easily?" },
  { sortOrder: 3, category: "Physical Build", question: "How would you describe your muscle tone naturally?" },
  { sortOrder: 4, category: "Skin & Hair", question: "Is your skin generally dry, warm/oily, or thick/moist?" },
  { sortOrder: 5, category: "Skin & Hair", question: "Do you tend toward dry hair, premature greying, or thick oily hair?" },
  { sortOrder: 6, category: "Skin & Hair", question: "Are your nails brittle, soft, or strong and thick?" },
  { sortOrder: 7, category: "Digestion & Appetite", question: "How is your appetite — irregular, strong/sharp, or slow/steady?" },
  { sortOrder: 8, category: "Digestion & Appetite", question: "Do you experience gas, bloating, acidity, or heaviness after meals?" },
  { sortOrder: 9, category: "Digestion & Appetite", question: "How often do you feel thirsty?" },
  { sortOrder: 10, category: "Digestion & Appetite", question: "What type of foods do you crave most? (dry/light, spicy/salty, sweet/heavy)" },
  { sortOrder: 11, category: "Elimination", question: "How regular is your bowel movement? (variable, frequent/loose, slow/constipated)" },
  { sortOrder: 12, category: "Elimination", question: "Is your stool generally hard/dry, soft/oily, or thick/mucous?" },
  { sortOrder: 13, category: "Sleep & Energy", question: "How many hours do you sleep and do you wake up rested?" },
  { sortOrder: 14, category: "Sleep & Energy", question: "Is your sleep light/interrupted, moderate, or deep/long?" },
  { sortOrder: 15, category: "Sleep & Energy", question: "How are your energy levels through the day?" },
  { sortOrder: 16, category: "Mind & Emotions", question: "Under stress, do you feel anxious/worried, irritable/angry, or withdrawn/lethargic?" },
  { sortOrder: 17, category: "Mind & Emotions", question: "How is your memory — quick but forgetful, sharp, or slow but steady?" },
  { sortOrder: 18, category: "Mind & Emotions", question: "How would you describe your speech — fast/irregular, sharp/precise, or slow/calm?" },
  { sortOrder: 19, category: "Lifestyle & Climate", question: "Which climate do you prefer — warm, cool, or moderate/dry?" },
  { sortOrder: 20, category: "Lifestyle & Climate", question: "How active are you by nature — restless, driven/intense, or calm/steady?" },
  { sortOrder: 21, category: "Lifestyle & Climate", question: "How do you respond to change — easily unsettled, impatient, or resistant/slow to adapt?" },
];

const THINGS_TO_AVOID = [
  { sortOrder: 1, title: "Cold, raw, and dry foods (salads, crackers, cold smoothies)" },
  { sortOrder: 2, title: "Iced drinks and excessive caffeine on an empty stomach" },
  { sortOrder: 3, title: "Irregular meal timings and skipping meals" },
  { sortOrder: 4, title: "Late-night heavy dinners close to bedtime" },
  { sortOrder: 5, title: "Spicy, fried, and overly salty foods" },
  { sortOrder: 6, title: "Excessive alcohol, vinegar, and fermented hot foods" },
  { sortOrder: 7, title: "Working or exercising in peak midday heat without cooling down" },
  { sortOrder: 8, title: "Heavy dairy, deep-fried sweets, and excessive oily foods" },
  { sortOrder: 9, title: "Daytime napping and oversleeping beyond 7–8 hours" },
  { sortOrder: 10, title: "Sedentary routine with minimal physical movement" },
  { sortOrder: 11, title: "Excessive screen time before sleep" },
  { sortOrder: 12, title: "Suppressing natural urges (hunger, thirst, urination, bowel movement)" },
  { sortOrder: 13, title: "Overeating even when not hungry" },
  { sortOrder: 14, title: "Emotional eating during stress without mindful awareness" },
  { sortOrder: 15, title: "Combining incompatible foods (e.g. milk with sour/fruits — per your plan)" },
];

const RECOMMENDATIONS = {
  vata: [
    "Favor warm, moist, and nourishing meals — soups, stews, cooked grains, and ghee in moderation.",
    "Eat at regular times; avoid skipping meals or long fasting without guidance.",
    "Include sweet, sour, and salty tastes; reduce bitter, astringent, and excessively dry foods.",
    "Practice grounding routines — oil massage (abhyanga), gentle yoga, and early bedtime.",
    "Stay warm in cold/windy weather; sip warm water or herbal teas through the day.",
    "Keep digestion steady with cooked vegetables, soaked nuts, and warm spices like ginger and cumin.",
  ],
  pitta: [
    "Favor cooling, moderately moist foods — fresh vegetables, sweet fruits, and whole grains.",
    "Reduce spicy, fried, salty, and overly sour foods that increase internal heat.",
    "Eat in a calm environment; avoid eating when angry, rushed, or overheated.",
    "Include sweet, bitter, and astringent tastes; limit excessive pungent and sour items.",
    "Practice cooling breathwork, moon walks, and swimming or moderate exercise in cool hours.",
    "Protect skin and eyes from harsh sun; stay hydrated with room-temperature water.",
  ],
  kapha: [
    "Favor light, warm, and dry foods — steamed vegetables, legumes, and spiced meals.",
    "Reduce heavy dairy, fried foods, cold desserts, and excessive sweet or oily dishes.",
    "Eat your largest meal at lunch; keep dinner light and finish 2–3 hours before sleep.",
    "Include pungent, bitter, and astringent tastes; minimize heavy sweet and salty foods.",
    "Maintain daily vigorous activity — brisk walking, dynamic yoga, or structured exercise.",
    "Avoid daytime sleeping; wake early and start the day with movement and warm water.",
  ],
  vata_pitta: [
    "Balance warmth with cooling — cooked meals that are nourishing but not overly spicy or oily.",
    "Eat on schedule; avoid both skipping meals (Vata) and eating when overheated (Pitta).",
    "Favor sweet and bitter tastes; reduce extreme dry, fried, or sharply pungent foods.",
    "Combine grounding practices (oil massage, routine) with cooling activities (evening walks, calm meals).",
    "Use mild spices like coriander and fennel rather than very hot chili or raw dry snacks.",
    "Prioritize steady sleep and stress regulation — meditation and consistent wake/sleep times.",
  ],
  pitta_kapha: [
    "Choose light, warm meals with moderate moisture — avoid both heavy oily foods and excess heat.",
    "Favor vegetables, legumes, and whole grains; limit fried sweets and sharp spicy dishes.",
    "Exercise regularly with variety — enough intensity for Kapha, not overheating for Pitta.",
    "Eat mindfully at lunch; keep dinners small, warm, and early.",
    "Include bitter and astringent vegetables; reduce excessive salt, sour, and dense dairy.",
    "Stay active after meals with a short walk; avoid long sedentary periods.",
  ],
  kapha_vata: [
    "Favor warm, lightly moist, easy-to-digest meals — soups, kitchari, and cooked vegetables.",
    "Avoid both cold dry snacks and heavy oily comfort foods.",
    "Maintain regular meal times and gentle daily movement to support digestion and circulation.",
    "Use warming spices in moderation — ginger, black pepper, and cumin without excess heat.",
    "Keep evenings warm and calming; limit cold exposure and irregular sleep patterns.",
    "Choose stimulating but sustainable routines — morning activity, light dinners, warm hydration.",
  ],
  sama_prakriti: [
    "Follow a balanced seasonal diet — adjust foods with weather and your current lifestyle load.",
    "Eat fresh, whole foods at regular times; avoid extremes of fasting or overeating.",
    "Include all six tastes in moderation across the week for nutritional and doshic balance.",
    "Maintain consistent sleep, daily movement, and stress-management practices year-round.",
    "Observe early signs of imbalance (digestion, sleep, mood) and make small timely corrections.",
    "Align routines with seasons — lighter foods in spring, cooling in summer, nourishing in winter.",
  ],
};

function questionKey(category, question) {
  return `${String(category).trim().toLowerCase()}::${String(question).trim().toLowerCase()}`;
}

function titleKey(title) {
  return String(title).trim().toLowerCase();
}

function recommendationKey(prakrutiType, title) {
  return `${prakrutiType}::${titleKey(title)}`;
}

async function scanKeys(tableName, projection, keyFn) {
  const keys = new Set();
  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        ProjectionExpression: projection,
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of Items || []) {
      keys.add(keyFn(item));
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);
  return keys;
}

async function seedQuestions() {
  console.log(`Seeding ${QUESTION_TABLE}...\n`);
  const seen = await scanKeys(QUESTION_TABLE, "category, question", (item) =>
    questionKey(item.category, item.question)
  );
  const base = Date.now();
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < QUESTIONS.length; i++) {
    const row = QUESTIONS[i];
    const key = questionKey(row.category, row.question);
    if (seen.has(key)) {
      console.log(`  - skipped (exists): [${row.category}] ${row.question}`);
      skipped++;
      continue;
    }

    const now = new Date(base + i * 1000).toISOString();
    await docClient.send(
      new PutCommand({
        TableName: QUESTION_TABLE,
        Item: {
          id: uuidv4(),
          category: row.category.trim(),
          question: row.question.trim(),
          sortOrder: row.sortOrder,
          status: "active",
          createdAt: now,
          updatedAt: now,
        },
      })
    );
    console.log(`  ✓ [${row.sortOrder}] [${row.category}] ${row.question}`);
    created++;
  }

  console.log(`\nQuestions: ${created} created, ${skipped} skipped.\n`);
  return { created, skipped };
}

async function seedThingsToAvoid() {
  console.log(`Seeding ${THING_TABLE}...\n`);
  const seen = await scanKeys(THING_TABLE, "title", (item) => titleKey(item.title));
  const base = Date.now();
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < THINGS_TO_AVOID.length; i++) {
    const row = THINGS_TO_AVOID[i];
    if (seen.has(titleKey(row.title))) {
      console.log(`  - skipped (exists): ${row.title}`);
      skipped++;
      continue;
    }

    const now = new Date(base + i * 1000).toISOString();
    await docClient.send(
      new PutCommand({
        TableName: THING_TABLE,
        Item: {
          id: uuidv4(),
          title: row.title.trim(),
          sortOrder: row.sortOrder,
          status: "active",
          createdAt: now,
          updatedAt: now,
        },
      })
    );
    console.log(`  ✓ [${row.sortOrder}] ${row.title}`);
    created++;
  }

  console.log(`\nThings to avoid: ${created} created, ${skipped} skipped.\n`);
  return { created, skipped };
}

async function seedRecommendations() {
  console.log(`Seeding ${RECOMMENDATION_TABLE}...\n`);
  const seen = await scanKeys(RECOMMENDATION_TABLE, "prakrutiType, title", (item) =>
    recommendationKey(item.prakrutiType, item.title)
  );
  const base = Date.now();
  let created = 0;
  let skipped = 0;
  let index = 0;

  for (const [prakrutiType, items] of Object.entries(RECOMMENDATIONS)) {
    for (let i = 0; i < items.length; i++) {
      const title = items[i];
      const key = recommendationKey(prakrutiType, title);
      if (seen.has(key)) {
        console.log(`  - skipped (exists): [${prakrutiType}] ${title}`);
        skipped++;
        continue;
      }

      const now = new Date(base + index * 1000).toISOString();
      index++;
      await docClient.send(
        new PutCommand({
          TableName: RECOMMENDATION_TABLE,
          Item: {
            id: uuidv4(),
            prakrutiType,
            title: title.trim(),
            sortOrder: i + 1,
            status: "active",
            createdAt: now,
            updatedAt: now,
          },
        })
      );
      console.log(`  ✓ [${prakrutiType}] ${title}`);
      created++;
    }
  }

  console.log(`\nRecommendations: ${created} created, ${skipped} skipped.\n`);
  return { created, skipped };
}

async function main() {
  console.log("Seeding Prakruti assessment catalog...\n");

  const questions = await seedQuestions();
  const things = await seedThingsToAvoid();
  const recommendations = await seedRecommendations();

  console.log("Done!");
  console.log(
    `  Questions: ${questions.created} created, ${questions.skipped} skipped (${QUESTIONS.length} in catalog)`
  );
  console.log(
    `  Things to avoid: ${things.created} created, ${things.skipped} skipped (${THINGS_TO_AVOID.length} in catalog)`
  );
  console.log(
    `  Recommendations: ${recommendations.created} created, ${recommendations.skipped} skipped`
  );
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});
