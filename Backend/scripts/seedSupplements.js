/**
 * Seed Supplement catalog with genuine wellness products (placeholder images).
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedSupplements.js
 */
require("dotenv").config();

const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");

const TABLE = "Supplement";

const SUPPLEMENTS = [
  {
    name: "Vitamin D3 2000 IU",
    description:
      "Supports bone health, immunity, and mood. Commonly recommended when sun exposure is limited.",
    packSize: 60,
    unit: "Softgels",
    price: 499,
  },
  {
    name: "Omega-3 Fish Oil",
    description:
      "EPA/DHA fatty acids for heart, brain, and inflammation support. Take with meals.",
    packSize: 90,
    unit: "Softgels",
    price: 899,
  },
  {
    name: "Magnesium Glycinate",
    description:
      "Gentle magnesium for sleep quality, muscle relaxation, and stress recovery.",
    packSize: 120,
    unit: "Caps",
    price: 749,
  },
  {
    name: "Probiotic 20 Billion CFU",
    description:
      "Multi-strain probiotic for gut balance, digestion, and post-antibiotic recovery support.",
    packSize: 30,
    unit: "Caps",
    price: 999,
  },
  {
    name: "Ashwagandha KSM-66",
    description:
      "Adaptogen traditionally used to support stress resilience, energy, and sleep.",
    packSize: 60,
    unit: "Caps",
    price: 699,
  },
  {
    name: "Whey Protein Isolate",
    description:
      "High-protein shake base for recovery and satiety. Mix with water or unsweetened milk.",
    packSize: 1000,
    unit: "g",
    price: 2499,
  },
  {
    name: "Electrolyte Hydration Mix",
    description:
      "Sodium, potassium, and magnesium blend for post-workout or hot-weather hydration.",
    packSize: 20,
    unit: "Sachets",
    price: 599,
  },
  {
    name: "Vitamin B-Complex",
    description:
      "B vitamins for energy metabolism and nervous system support, especially under stress.",
    packSize: 60,
    unit: "Tablets",
    price: 449,
  },
];

async function existingNames() {
  const names = new Set();
  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        ProjectionExpression: "#n",
        ExpressionAttributeNames: { "#n": "name" },
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of Items || []) {
      if (item.name) names.add(String(item.name).trim().toLowerCase());
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);
  return names;
}

async function main() {
  console.log("Seeding Supplement catalog...\n");
  const seen = await existingNames();
  const base = Date.now();
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < SUPPLEMENTS.length; i += 1) {
    const row = SUPPLEMENTS[i];
    if (seen.has(row.name.trim().toLowerCase())) {
      console.log(`  - skipped: ${row.name}`);
      skipped += 1;
      continue;
    }
    const now = new Date(base + i * 1000).toISOString();
    const item = {
      id: uuidv4(),
      name: row.name,
      description: row.description,
      packSize: row.packSize,
      unit: row.unit,
      price: row.price,
      // Placeholder key — replace via admin UI upload later.
      image: `supplement/seed/${row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
    console.log(`  ✓ ${row.name}`);
    created += 1;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
