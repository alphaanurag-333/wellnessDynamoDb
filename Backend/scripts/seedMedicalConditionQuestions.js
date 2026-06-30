require("dotenv").config();

const { v4: uuidv4 } = require("uuid");
const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

const TABLE = "MedicalConditionQuestion";

// Real onboarding medical-condition questions. Order here is the order users see
// them (createdAt is staggered below so the active list stays stable).
const QUESTIONS = [
  { question: "Do you currently have any diagnosed medical conditions?", answerType: "yes_no_text" },
  { question: "Are you currently taking any medications?", answerType: "yes_no_text" },
  { question: "Have you had any surgeries in the past?", answerType: "yes_no_text" },
  { question: "Do you have any physical activity restrictions or injuries?", answerType: "yes_no_text" },
  { question: "Do you have any known allergies (food, medication, environmental)?", answerType: "yes_no_text" },
  { question: "Is there any family history of chronic illness (diabetes, heart disease, etc.)?", answerType: "yes_no_text" },
  { question: "Do you smoke or consume tobacco?", answerType: "yes_no" },
  { question: "Do you consume alcohol?", answerType: "yes_no" },
  { question: "When was your last full medical check-up?", answerType: "date" },
  { question: "Briefly describe your current health goals.", answerType: "text" },
];

async function existingQuestionTexts() {
  const texts = new Set();
  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        ProjectionExpression: "question",
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of Items || []) {
      if (item.question) texts.add(String(item.question).trim().toLowerCase());
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);
  return texts;
}

async function main() {
  console.log(`Seeding ${TABLE} with real onboarding questions...\n`);

  const seen = await existingQuestionTexts();
  const base = Date.now();
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < QUESTIONS.length; i++) {
    const { question, answerType } = QUESTIONS[i];
    if (seen.has(question.trim().toLowerCase())) {
      console.log(`  - skipped (exists): ${question}`);
      skipped++;
      continue;
    }

    // Stagger createdAt by 1s each so the active list keeps a deterministic order.
    const now = new Date(base + i * 1000).toISOString();
    const item = {
      id: uuidv4(),
      question: question.trim(),
      answerType,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
    console.log(`  ✓ [${answerType}] ${question}`);
    created++;
  }

  console.log(`\nDone! ${created} created, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});
