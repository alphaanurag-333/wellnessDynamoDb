require("dotenv").config();

const { v4: uuidv4 } = require("uuid");
const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

const TABLE = "LaunchQuestion";

/**
 * LAUNCH assessment question catalog (Lifestyle Assessment for Understanding
 * Nutrition & Conscious Habits). Matches the coach spreadsheet structure.
 * sortOrder controls display/export order within and across categories.
 */
const QUESTIONS = [
  // —— General Information ——
  { sortOrder: 1, category: "General Information", question: "Where are you originally from?" },
  { sortOrder: 2, category: "General Information", question: "Your current location?" },
  {
    sortOrder: 3,
    category: "General Information",
    question: "Who all are in your family? How many people stay with you?",
  },
  { sortOrder: 4, category: "General Information", question: "Are you working?" },
  { sortOrder: 5, category: "General Information", question: "What is your role?" },
  { sortOrder: 6, category: "General Information", question: "What are your working hours?" },
  { sortOrder: 7, category: "General Information", question: "Do you have hair fall or dandruff?" },
  { sortOrder: 8, category: "General Information", question: "Do you have dry skin?" },
  {
    sortOrder: 9,
    category: "General Information",
    question: "How committed are you for your health goal? (1–10)",
  },

  // —— Food, Water & Timings ——
  {
    sortOrder: 10,
    category: "Food, Water & Timings",
    question: "What is the first thing (drink) that you have after waking up?",
  },
  { sortOrder: 11, category: "Food, Water & Timings", question: "Do you have your breakfast?" },
  { sortOrder: 12, category: "Food, Water & Timings", question: "If yes, then at what time?" },
  { sortOrder: 13, category: "Food, Water & Timings", question: "And what do you eat for breakfast?" },
  {
    sortOrder: 14,
    category: "Food, Water & Timings",
    question: "Do you take morning snacks? If yes, what time and what do you eat?",
  },
  { sortOrder: 15, category: "Food, Water & Timings", question: "What time do you have your lunch?" },
  { sortOrder: 16, category: "Food, Water & Timings", question: "What do you eat for lunch?" },
  {
    sortOrder: 17,
    category: "Food, Water & Timings",
    question: "Do you have evening snacks? If yes, what time and what do you eat?",
  },
  { sortOrder: 18, category: "Food, Water & Timings", question: "What time do you have your dinner?" },
  { sortOrder: 19, category: "Food, Water & Timings", question: "What do you eat for dinner?" },
  {
    sortOrder: 20,
    category: "Food, Water & Timings",
    question: "Do you take tea, coffee, or black coffee regularly?",
  },
  {
    sortOrder: 21,
    category: "Food, Water & Timings",
    question: "If yes, how many times and when?",
  },
  {
    sortOrder: 22,
    category: "Food, Water & Timings",
    question: "How many glasses of water do you drink in a day?",
  },
  {
    sortOrder: 23,
    category: "Food, Water & Timings",
    question: "How many times do you eat out in a week?",
  },

  // —— Sleep & Recovery ——
  { sortOrder: 24, category: "Sleep & Recovery", question: "What time do you usually go to bed?" },
  { sortOrder: 25, category: "Sleep & Recovery", question: "What time do you usually wake up?" },
  {
    sortOrder: 26,
    category: "Sleep & Recovery",
    question: "Do you feel rested when you wake up?",
  },
  {
    sortOrder: 27,
    category: "Sleep & Recovery",
    question: "Do you have trouble falling asleep or staying asleep?",
  },

  // —— Physical Activity ——
  {
    sortOrder: 28,
    category: "Physical Activity",
    question: "Do you exercise or do any physical activity regularly?",
  },
  {
    sortOrder: 29,
    category: "Physical Activity",
    question: "If yes, what type of exercise and how many days per week?",
  },
  {
    sortOrder: 30,
    category: "Physical Activity",
    question: "How many steps do you walk on an average day?",
  },
  {
    sortOrder: 31,
    category: "Physical Activity",
    question: "How much time do you spend sitting per day (work + leisure)?",
  },

  // —— Stress & Mental Wellbeing ——
  {
    sortOrder: 32,
    category: "Stress & Mental Wellbeing",
    question: "How would you rate your stress level? (1–10)",
  },
  {
    sortOrder: 33,
    category: "Stress & Mental Wellbeing",
    question: "Do you practice any relaxation technique (meditation, yoga, breathing)?",
  },
  {
    sortOrder: 34,
    category: "Stress & Mental Wellbeing",
    question: "How many hours of screen time do you have outside of work?",
  },

  // —— Digestion & Energy ——
  {
    sortOrder: 35,
    category: "Digestion & Energy",
    question: "Do you experience bloating, acidity, or indigestion?",
  },
  {
    sortOrder: 36,
    category: "Digestion & Energy",
    question: "How would you rate your energy levels through the day? (1–10)",
  },
  {
    sortOrder: 37,
    category: "Digestion & Energy",
    question: "Do you feel hungry at regular intervals?",
  },
];

function questionKey(category, question) {
  return `${String(category).trim().toLowerCase()}::${String(question).trim().toLowerCase()}`;
}

async function existingQuestionKeys() {
  const keys = new Set();
  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        ProjectionExpression: "category, question",
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of Items || []) {
      keys.add(questionKey(item.category, item.question));
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);
  return keys;
}

async function main() {
  console.log(`Seeding ${TABLE} with LAUNCH assessment questions...\n`);

  const seen = await existingQuestionKeys();
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
    const item = {
      id: uuidv4(),
      category: row.category.trim(),
      question: row.question.trim(),
      sortOrder: row.sortOrder,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
    console.log(`  ✓ [${row.sortOrder}] [${row.category}] ${row.question}`);
    created++;
  }

  console.log(`\nDone! ${created} created, ${skipped} skipped (${QUESTIONS.length} total in catalog).`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});
