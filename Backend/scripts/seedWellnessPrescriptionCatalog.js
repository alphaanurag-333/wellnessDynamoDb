require("dotenv").config();

const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const {
  TABLE,
  createWellnessPrescriptionCatalog,
  deleteWellnessPrescriptionCatalog,
} = require("../models/wellnessPrescriptionCatalogModel");

const PRESCRIPTIONS = [
  {
    prescriptionId: "gut-reset-day-1-7",
    title: "Gut Reset · Day 1-7",
    category: "General",
    status: "active",
    sequence: 1,
    points: [
      "Warm lemon water on waking (500 ml)",
      "No dairy, gluten or refined sugar",
      "1 cup bone broth or veg stock at lunch",
      "Cooked, easily digestible dinner before 7 PM",
      "Probiotic-rich food once daily (curd / kanji)",
      "10-min walk after every meal",
    ],
  },
  {
    prescriptionId: "water-fasting-24h",
    title: "Water Fasting · 24h",
    category: "General",
    status: "active",
    sequence: 2,
    points: [
      "Only water for the full 24h window",
      "Target 3–4 L water through the day",
      "No tea, coffee or supplements unless prescribed",
      "Rest and avoid strenuous exercise",
      "Break fast gently with warm lemon water",
      "Light cooked food 30 min after breaking fast",
    ],
  },
  {
    prescriptionId: "intermittent-fasting-16-8",
    title: "Intermittent Fasting 16:8",
    category: "General",
    status: "active",
    sequence: 3,
    points: [
      "Eating window 12 PM – 8 PM",
      "Black coffee / green tea allowed while fasting",
      "Protein-forward first meal",
      "No snacking after 8 PM",
      "Hydrate well during fasting hours",
    ],
  },
  {
    prescriptionId: "liver-detox-day-1-5",
    title: "Liver Detox · Day 1-5",
    category: "General",
    status: "active",
    sequence: 4,
    points: [
      "Beetroot-carrot-amla juice each morning",
      "No fried or processed food",
      "Warm lemon water on waking",
      "Light dinner before 7 PM",
      "10-min walk after meals",
    ],
  },
];

async function scanAllIds() {
  const ids = [];
  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        ProjectionExpression: "id",
        ExclusiveStartKey: lastKey,
      }),
    );
    for (const item of Items || []) {
      if (item?.id) ids.push(item.id);
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);
  return ids;
}

async function clearCatalog() {
  const ids = await scanAllIds();
  for (const id of ids) {
    await deleteWellnessPrescriptionCatalog(id);
  }
  return ids.length;
}

async function main() {
  console.log("Resetting WellnessPrescriptionCatalog...\n");
  const removed = await clearCatalog();
  console.log(`  removed ${removed} existing protocol${removed === 1 ? "" : "s"}\n`);

  let created = 0;
  for (const prescription of PRESCRIPTIONS) {
    await createWellnessPrescriptionCatalog({
      ...prescription,
      createdBy: "seed-script",
    });
    console.log(`  ✓ ${prescription.title}`);
    created += 1;
  }

  console.log(`\nWellnessPrescriptionCatalog: ${removed} cleared, ${created} seeded.`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});
