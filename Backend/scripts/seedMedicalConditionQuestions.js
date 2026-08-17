require("dotenv").config();

const { v4: uuidv4 } = require("uuid");
const { PutCommand, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

const TABLE = "MedicalConditionQuestion";

// Real onboarding medical-condition questions. Order here is the order users see.
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

async function existingQuestions() {
  const items = [];
  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        ProjectionExpression: "id, question, sortOrder",
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...(Items || []));
    lastKey = LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function main() {
  console.log(`Seeding ${TABLE} with real onboarding questions...\n`);

  const existing = await existingQuestions();
  const byText = new Map(
    existing
      .filter((item) => item.question)
      .map((item) => [String(item.question).trim().toLowerCase(), item]),
  );
  const base = Date.now();
  let created = 0;
  let skipped = 0;
  let ordered = 0;

  for (let i = 0; i < QUESTIONS.length; i++) {
    const { question, answerType } = QUESTIONS[i];
    const sortOrder = i + 1;
    const current = byText.get(question.trim().toLowerCase());
    if (current) {
      if (current.sortOrder === undefined || current.sortOrder === null) {
        await docClient.send(new UpdateCommand({
          TableName: TABLE,
          Key: { id: current.id },
          UpdateExpression: "SET sortOrder = :sortOrder, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":sortOrder": sortOrder,
            ":updatedAt": new Date().toISOString(),
          },
        }));
        console.log(`  ~ order ${sortOrder}: ${question}`);
        ordered++;
      } else {
        console.log(`  - skipped (exists): ${question}`);
        skipped++;
      }
      continue;
    }

    const now = new Date(base + i * 1000).toISOString();
    const item = {
      id: uuidv4(),
      question: question.trim(),
      answerType,
      status: "active",
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
    console.log(`  ✓ [${answerType}] ${question}`);
    created++;
  }

  console.log(`\nDone! ${created} created, ${ordered} ordered, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});
