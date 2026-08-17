require("dotenv").config();

const { DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");
const {
  createLaunchRating,
  listAllRatingsUnpaged,
} = require("../models/launchRatingModel");
const {
  createLaunchDomain,
  listAllDomainsUnpaged,
} = require("../models/launchDomainModel");
const {
  createLaunchDomainQuestion,
  listAllQuestionsUnpaged,
} = require("../models/launchDomainQuestionModel");

const RATINGS = [
  {
    name: "Excellent",
    badge: "EXCELLENT",
    tone: "excellent",
    points: 100,
    description: "Consistent and self-driven — reinforce the habit, no change needed.",
    sortOrder: 1,
  },
  {
    name: "Good",
    badge: "GOOD",
    tone: "good",
    points: 75,
    description: "Mostly on track — one small nudge on the weaker days.",
    sortOrder: 2,
  },
  {
    name: "Fair",
    badge: "FAIR",
    tone: "average",
    points: 50,
    description: "Inconsistent — set a single specific target for the week.",
    sortOrder: 3,
  },
  {
    name: "Poor",
    badge: "POOR",
    tone: "poor",
    points: 25,
    description: "Needs intervention — protocol change or a call this week.",
    sortOrder: 4,
  },
];

const GUT_HEALTH_QUESTIONS = [
  "How often do you experience bloating after meals?",
  "How regular are your bowel movements?",
  "Do you feel discomfort or acidity after eating?",
  "How often do you eat fermented foods (curd, kimchi, etc.)?",
  "How much fibre-rich food is in your daily diet?",
  "Do you experience frequent gas or flatulence?",
  "How often do you feel heaviness after a meal?",
  "Do you take probiotics or gut supplements?",
  "How well hydrated do you stay through the day?",
  "Do you experience food intolerances or sensitivities?",
  "How often do you eat processed or packaged foods?",
  "Do you chew your food slowly and thoroughly?",
  "How often do you skip or delay meals?",
  "Do you experience cravings for sugar or refined carbs?",
  "How would you rate your overall digestion?",
  "Do you notice a link between stress and your gut?",
];

const IMMUNITY_QUESTIONS = [
  "How often do you fall sick in a year?",
  "How quickly do you recover from common illnesses?",
  "How often do you get seasonal infections?",
  "Do you take vitamin C, D or zinc regularly?",
  "How much sunlight exposure do you get daily?",
  "How varied and colourful is your diet?",
  "Do you experience frequent fatigue or low energy?",
  "How often do you get restorative sleep?",
  "Do you have any recurring allergies?",
  "How often do you exercise moderately?",
  "Do you manage stress levels effectively?",
  "How well do wounds or cuts heal for you?",
  "Do you consume enough protein daily?",
  "How often do you eat immunity-supporting foods?",
  "Do you smoke or are exposed to smoke?",
  "How would you rate your overall resilience to illness?",
];

const PHYSICAL_QUESTIONS = [
  "How many days a week do you exercise?",
  "How would you rate your cardiovascular fitness?",
  "How would you rate your muscular strength?",
  "How flexible are you?",
  "Do you experience joint pain or stiffness?",
  "How is your balance and coordination?",
  "How many hours do you sit per day?",
  "Do you take regular breaks from sitting?",
  "How often do you stretch or do mobility work?",
  "How is your posture through the day?",
  "Do you experience frequent physical fatigue?",
  "How well do you maintain a healthy weight?",
  "How often do you engage in strength training?",
  "Do you get enough restorative sleep for recovery?",
  "How would you rate your overall physical stamina?",
  "Do you listen to your body and rest when needed?",
];

const MENTAL_QUESTIONS = [
  "How would you rate your daily stress level?",
  "How often do you feel anxious or on edge?",
  "How well do you concentrate on tasks?",
  "How often do you feel low or unmotivated?",
  "How well do you manage work-life balance?",
  "Do you practise mindfulness or meditation?",
  "How restful and consistent is your sleep?",
  "How often do you feel mentally exhausted?",
  "How well do you handle unexpected changes?",
  "Do you have healthy outlets for stress?",
  "How would you rate your emotional stability?",
  "How often do you feel positive and optimistic?",
  "Do you seek support when feeling low?",
  "How well do you sleep when stressed?",
  "How often do you feel mentally refreshed after waking?",
  "How well do you manage negative self-talk?",
];

const PSYCHOLOGICAL_QUESTIONS = [
  "How satisfied are you with your life overall?",
  "How connected do you feel to others socially?",
  "How often do you feel lonely or isolated?",
  "How would you rate your self-esteem?",
  "Do you feel understood by people close to you?",
  "How well do you express your emotions?",
  "How often do you engage in meaningful conversations?",
  "Do you feel satisfied with your personal relationships?",
  "How would you rate your resilience after setbacks?",
  "Do you set and pursue personal goals?",
  "How often do you feel a sense of accomplishment?",
  "How well do you cope with criticism or rejection?",
  "Do you practice self-compassion?",
  "How would you rate your overall life satisfaction?",
  "How well do you manage negative self-talk?",
  "How aligned are your actions with your values?",
];

const DOMAINS = [
  { name: "Gut Health", weight: 20, sortOrder: 1, questions: GUT_HEALTH_QUESTIONS },
  { name: "Immunity", weight: 20, sortOrder: 2, questions: IMMUNITY_QUESTIONS },
  { name: "Physical Health", weight: 20, sortOrder: 3, questions: PHYSICAL_QUESTIONS },
  { name: "Mental Health", weight: 20, sortOrder: 4, questions: MENTAL_QUESTIONS },
  { name: "Psychological Health", weight: 20, sortOrder: 5, questions: PSYCHOLOGICAL_QUESTIONS },
];

function keyName(value) {
  return String(value || "").trim().toLowerCase();
}

function questionPoints(index) {
  return index < 4 ? 7 : 6;
}

async function waitForTable(tableName, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const { Table } = await client.send(new DescribeTableCommand({ TableName: tableName }));
      if (Table?.TableStatus === "ACTIVE") return;
    } catch (err) {
      if (err?.name !== "ResourceNotFoundException") throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Table ${tableName} is not ACTIVE`);
}

async function main() {
  console.log("Seeding LAUNCH config (ratings, domains, questions)...\n");
  await waitForTable("LaunchRating");
  await waitForTable("LaunchDomain");
  await waitForTable("LaunchDomainQuestion");

  const existingRatings = await listAllRatingsUnpaged();
  const ratingKeys = new Set(existingRatings.map((row) => keyName(row.name)));
  let ratingsCreated = 0;
  let ratingsSkipped = 0;

  for (const row of RATINGS) {
    if (ratingKeys.has(keyName(row.name))) {
      console.log(`  - rating skipped (exists): ${row.name}`);
      ratingsSkipped += 1;
      continue;
    }
    await createLaunchRating(row);
    console.log(`  ✓ rating [${row.sortOrder}] ${row.name} · ${row.points} pts`);
    ratingsCreated += 1;
  }

  const existingDomains = await listAllDomainsUnpaged();
  const domainByName = new Map(existingDomains.map((row) => [keyName(row.name), row]));
  const existingQuestions = await listAllQuestionsUnpaged();
  const questionKeys = new Set(
    existingQuestions.map((row) => `${row.domainId}::${keyName(row.name)}`)
  );

  let domainsCreated = 0;
  let domainsSkipped = 0;
  let questionsCreated = 0;
  let questionsSkipped = 0;

  for (const domainRow of DOMAINS) {
    let domain = domainByName.get(keyName(domainRow.name));
    if (domain) {
      console.log(`  - domain skipped (exists): ${domainRow.name}`);
      domainsSkipped += 1;
    } else {
      domain = await createLaunchDomain({
        name: domainRow.name,
        weight: domainRow.weight,
        live: true,
        fixed: false,
        sortOrder: domainRow.sortOrder,
      });
      domainByName.set(keyName(domain.name), domain);
      console.log(`  ✓ domain [${domainRow.sortOrder}] ${domain.name} · ${domain.weight}%`);
      domainsCreated += 1;
    }

    for (let i = 0; i < domainRow.questions.length; i++) {
      const text = domainRow.questions[i];
      const qKey = `${domain.id}::${keyName(text)}`;
      if (questionKeys.has(qKey)) {
        questionsSkipped += 1;
        continue;
      }
      await createLaunchDomainQuestion({
        domainId: domain.id,
        name: text,
        points: questionPoints(i),
        enabled: true,
        fixed: false,
        hasInfo: true,
        sortOrder: i + 1,
      });
      questionKeys.add(qKey);
      questionsCreated += 1;
    }
    console.log(`    questions: ${domainRow.questions.length} in ${domainRow.name} (4×7 + 12×6 = 100 pts)`);
  }

  console.log(
    `\nDone! ratings ${ratingsCreated} created / ${ratingsSkipped} skipped · domains ${domainsCreated} created / ${domainsSkipped} skipped · questions ${questionsCreated} created / ${questionsSkipped} skipped.`
  );
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});
