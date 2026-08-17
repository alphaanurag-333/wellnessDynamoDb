require("dotenv").config();

const { DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");
const { createDrfSection, listAllSectionsUnpaged } = require("../models/drfSectionModel");
const {
  createDrfSectionQuestion,
  listAllQuestionsUnpaged,
} = require("../models/drfSectionQuestionModel");

const SECTIONS = [
  {
    name: "Meal Tracking",
    weight: 20,
    sortOrder: 1,
    questions: [
      { name: "Salad", points: 17 },
      { name: "Protein", points: 17 },
      { name: "Protein quantity", points: 17 },
      { name: "Water", points: 17 },
      { name: "Functional juice", points: 16 },
      { name: "No junk food / refined oil", points: 16 },
    ],
  },
  {
    name: "Nutritions",
    weight: 35,
    sortOrder: 2,
    questions: [
      { name: "Dosages taken as prescribed", points: 50 },
      { name: "Correct quantity (Qty)", points: 50 },
    ],
  },
  {
    name: "Physical Activities",
    weight: 25,
    sortOrder: 3,
    questions: [
      { name: "Steps goal met", points: 34 },
      { name: "Workout completed", points: 33 },
      { name: "Yoga", points: 33 },
    ],
  },
  {
    name: "Mindfulness & Mood",
    weight: 20,
    sortOrder: 4,
    questions: [
      { name: "Meditation / breathing", points: 34 },
      { name: "Gratitude / journalling", points: 33 },
      { name: "Overall mood was positive", points: 33 },
    ],
  },
];

function keyName(value) {
  return String(value || "").trim().toLowerCase();
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
  console.log("Seeding DRF activity bank (sections + questions)...\n");
  await waitForTable("DrfSection");
  await waitForTable("DrfSectionQuestion");

  const existingSections = await listAllSectionsUnpaged();
  const sectionByName = new Map(existingSections.map((row) => [keyName(row.name), row]));
  const existingQuestions = await listAllQuestionsUnpaged();
  const questionKeys = new Set(
    existingQuestions.map((row) => `${row.sectionId}::${keyName(row.name)}`)
  );

  let sectionsCreated = 0;
  let sectionsSkipped = 0;
  let questionsCreated = 0;
  let questionsSkipped = 0;

  for (const sectionRow of SECTIONS) {
    let section = sectionByName.get(keyName(sectionRow.name));
    if (section) {
      console.log(`  - section skipped (exists): ${sectionRow.name}`);
      sectionsSkipped += 1;
    } else {
      section = await createDrfSection({
        name: sectionRow.name,
        weight: sectionRow.weight,
        live: true,
        fixed: false,
        sortOrder: sectionRow.sortOrder,
      });
      sectionByName.set(keyName(section.name), section);
      console.log(`  ✓ section [${sectionRow.sortOrder}] ${section.name} · ${section.weight}%`);
      sectionsCreated += 1;
    }

    const pts = sectionRow.questions.reduce((sum, q) => sum + q.points, 0);
    for (let i = 0; i < sectionRow.questions.length; i++) {
      const row = sectionRow.questions[i];
      const qKey = `${section.id}::${keyName(row.name)}`;
      if (questionKeys.has(qKey)) {
        questionsSkipped += 1;
        continue;
      }
      await createDrfSectionQuestion({
        sectionId: section.id,
        name: row.name,
        points: row.points,
        enabled: true,
        fixed: false,
        sortOrder: i + 1,
      });
      questionKeys.add(qKey);
      questionsCreated += 1;
    }
    console.log(`    questions: ${sectionRow.questions.length} in ${sectionRow.name} (${pts} pts)`);
  }

  console.log(
    `\nDone! sections ${sectionsCreated} created / ${sectionsSkipped} skipped · questions ${questionsCreated} created / ${questionsSkipped} skipped.`
  );
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});
