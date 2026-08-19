require("dotenv").config();

const { v4: uuidv4 } = require("uuid");
const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

// ──────────────── Supplements ────────────────
const SUPPLEMENTS = [
  { name: "Omega-3 Fish Oil", description: "High-potency EPA & DHA for heart and brain health.", packSize: 60, unit: "Softgels", price: 799, status: "active" },
  { name: "Vitamin D3 + K2", description: "Supports bone strength and immune function.", packSize: 90, unit: "Caps", price: 549, status: "active" },
  { name: "Whey Protein Isolate", description: "25g clean protein per serving for muscle recovery.", packSize: 1000, unit: "g", price: 2499, status: "active" },
  { name: "Magnesium Glycinate", description: "Promotes relaxation, sleep and muscle recovery.", packSize: 120, unit: "Tablets", price: 649, status: "active" },
  { name: "Probiotic Complex", description: "20 billion CFU multi-strain gut health support.", packSize: 30, unit: "Caps", price: 899, status: "active" },
  { name: "Ashwagandha KSM-66", description: "Adaptogen for stress, focus and energy.", packSize: 60, unit: "Caps", price: 599, status: "active" },
  { name: "Multivitamin Daily", description: "Complete daily micronutrient support.", packSize: 60, unit: "Tablets", price: 499, status: "active" },
  { name: "Electrolyte Hydration", description: "Sugar-free electrolytes for daily hydration.", packSize: 20, unit: "Sachets", price: 449, status: "inactive" },
];

async function existingValues(table, field) {
  const seen = new Set();
  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: table,
        ProjectionExpression: "#f",
        ExpressionAttributeNames: { "#f": field },
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of Items || []) {
      if (item[field]) seen.add(String(item[field]).trim().toLowerCase());
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);
  return seen;
}

async function seedTable({ table, field, rows, buildItem }) {
  console.log(`\nSeeding ${table}...`);
  const seen = await existingValues(table, field);
  const base = Date.now();
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const key = String(row[field] || "").trim().toLowerCase();
    if (seen.has(key)) {
      console.log(`  - skipped (exists): ${row[field]}`);
      skipped++;
      continue;
    }

    // Stagger createdAt so list ordering (newest first) is deterministic.
    const now = new Date(base + i * 1000).toISOString();
    const item = { id: uuidv4(), ...buildItem(row), createdAt: now, updatedAt: now };

    await docClient.send(new PutCommand({ TableName: table, Item: item }));
    console.log(`  ✓ ${row[field]}`);
    created++;
  }

  console.log(`  ${table}: ${created} created, ${skipped} skipped.`);
}

async function main() {
  await seedTable({
    table: "Supplement",
    field: "name",
    rows: SUPPLEMENTS,
    buildItem: (r) => ({
      name: r.name.trim(),
      description: r.description.trim(),
      packSize: Number(r.packSize) || 0,
      unit: r.unit.trim(),
      price: Number(r.price) || 0,
      image: "",
      status: r.status,
    }),
  });

  console.log("\nDone seeding supplements.");
  console.log("Mental / yoga / exercise libraries: npm run seed:wellness-libraries");
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});
