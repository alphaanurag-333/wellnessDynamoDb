require("dotenv").config();

const { v4: uuidv4 } = require("uuid");
const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

const TABLE = "LaunchFocusArea";

const FOCUS_AREAS = [
  { sortOrder: 1, title: "Improve morning hydration — drink warm water after waking up" },
  { sortOrder: 2, title: "Establish a consistent breakfast routine with balanced nutrients" },
  { sortOrder: 3, title: "Reduce tea/coffee intake and avoid late-evening caffeine" },
  { sortOrder: 4, title: "Plan regular meal timings and avoid long gaps between meals" },
  { sortOrder: 5, title: "Increase daily water intake throughout the day" },
  { sortOrder: 6, title: "Limit eating out and choose healthier food options" },
  { sortOrder: 7, title: "Improve sleep schedule — aim for 7–8 hours of quality sleep" },
  { sortOrder: 8, title: "Add daily physical activity or walking routine" },
  { sortOrder: 9, title: "Practice stress management — meditation, yoga, or breathing exercises" },
  { sortOrder: 10, title: "Reduce screen time especially before bedtime" },
  { sortOrder: 11, title: "Address digestion issues — eat mindfully and avoid heavy late dinners" },
  { sortOrder: 12, title: "Build sustainable energy through balanced meals and adequate rest" },
];

async function existingTitles() {
  const titles = new Set();
  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        ProjectionExpression: "title",
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of Items || []) {
      if (item.title) titles.add(String(item.title).trim().toLowerCase());
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);
  return titles;
}

async function main() {
  console.log(`Seeding ${TABLE}...\n`);

  const seen = await existingTitles();
  const base = Date.now();
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < FOCUS_AREAS.length; i++) {
    const row = FOCUS_AREAS[i];
    if (seen.has(row.title.trim().toLowerCase())) {
      console.log(`  - skipped: ${row.title}`);
      skipped++;
      continue;
    }

    const now = new Date(base + i * 1000).toISOString();
    await docClient.send(
      new PutCommand({
        TableName: TABLE,
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

  console.log(`\nDone! ${created} created, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});
