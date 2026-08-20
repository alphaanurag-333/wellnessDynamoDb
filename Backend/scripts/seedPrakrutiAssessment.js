require("dotenv").config();

const { v4: uuidv4 } = require("uuid");
const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

const QUESTION_TABLE = "PrakrutiQuestion";
const THING_TABLE = "PrakrutiThingToAvoid";
const RECOMMENDATION_TABLE = "PrakrutiRecommendation";

const QUESTIONS = [
  // Vāta (Air + Space) — 10 statements
  { sortOrder: 1, category: "Vata", question: "I would play on the ground rather than watch TV." },
  { sortOrder: 2, category: "Vata", question: "I get cold easily." },
  { sortOrder: 3, category: "Vata", question: "My thoughts jump from one idea to another." },
  { sortOrder: 4, category: "Vata", question: "I speak quickly and love talking." },
  { sortOrder: 5, category: "Vata", question: "I often forget to eat or feel hungry at odd times." },
  { sortOrder: 6, category: "Vata", question: "My sleep is light and sometimes I wake up at night." },
  { sortOrder: 7, category: "Vata", question: "I love doing new things and get bored easily." },
  { sortOrder: 8, category: "Vata", question: "My mood can change quickly." },
  { sortOrder: 9, category: "Vata", question: "I get tired easily but also recharge fast." },
  { sortOrder: 10, category: "Vata", question: "I am thin and my hands and feet are often cold." },
  // Pitta (Fire + Water) — 10 statements
  { sortOrder: 11, category: "Pitta", question: "I love to be captain of a team." },
  { sortOrder: 12, category: "Pitta", question: "I feel warm or get hot easily." },
  { sortOrder: 13, category: "Pitta", question: "I can focus really well." },
  { sortOrder: 14, category: "Pitta", question: "I get very hungry on time!" },
  { sortOrder: 15, category: "Pitta", question: "I speak clearly and with confidence." },
  { sortOrder: 16, category: "Pitta", question: "I sleep okay, but not too long." },
  { sortOrder: 17, category: "Pitta", question: "I enjoy challenges and solving problems." },
  { sortOrder: 18, category: "Pitta", question: "I can get angry or irritated quickly." },
  { sortOrder: 19, category: "Pitta", question: "I have strong energy and keep going." },
  { sortOrder: 20, category: "Pitta", question: "I have a medium body and feel warm." },
  // Kapha (Earth + Water) — 10 statements
  { sortOrder: 21, category: "Kapha", question: "I don’t get tense during exams." },
  { sortOrder: 22, category: "Kapha", question: "I often feel cold, but my body is strong." },
  { sortOrder: 23, category: "Kapha", question: "I take time to learn but remember everything." },
  { sortOrder: 24, category: "Kapha", question: "I speak slowly and softly." },
  { sortOrder: 25, category: "Kapha", question: "I don’t feel very hungry often." },
  { sortOrder: 26, category: "Kapha", question: "I love sleeping and need more rest." },
  { sortOrder: 27, category: "Kapha", question: "I like familiar things and routines." },
  { sortOrder: 28, category: "Kapha", question: "I stay calm and don’t get upset easily." },
  { sortOrder: 29, category: "Kapha", question: "I have steady energy that lasts long." },
  { sortOrder: 30, category: "Kapha", question: "I have a bigger or stronger body." },
];

const THINGS_TO_AVOID = [
  { sortOrder: 1, title: "Cold, raw and dry foods — salads, crackers, chips, iced drinks." },
  { sortOrder: 2, title: "Excess caffeine and carbonated / fizzy drinks." },
  { sortOrder: 3, title: "Skipping meals or eating at irregular times." },
  { sortOrder: 4, title: "Very bitter, astringent or overly spicy dishes in large amounts." },
  { sortOrder: 5, title: "Excess dry beans and lentils without adequate oil or spices." },
];

const RECOMMENDATIONS = {
  vata: [
    "Favour warm, cooked, moist and lightly oily meals to balance Vāta dryness.",
    "Keep regular meal and sleep timings — routine steadies an airy constitution.",
    "Add grounding foods: whole grains, root vegetables, ghee, soaked nuts.",
    "Stay hydrated with warm water and herbal teas (ginger, tulsi, cinnamon).",
    "Practise calming movement — gentle yoga, walking, and daily oil self-massage.",
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
