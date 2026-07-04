/**
 * Seed VideoTestimonials with sample active/inactive link-type entries.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedVideoTestimonials.js
 */
require("dotenv").config();

const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { createVideoTestimonial } = require("../models/videoTestimonials");

const TABLE = "VideoTestimonials";

const VIDEO_TESTIMONIALS = [
  {
    name: "Priya Sharma",
    type: "link",
    ytLink: "https://www.youtube.com/watch?v=9vJRnapAFg0",
    status: "active",
  },
  {
    name: "Rajesh Kumar",
    type: "link",
    ytLink: "https://www.youtube.com/watch?v=ldY5DG9bEpE",
    status: "active",
  },
  {
    name: "Ananya Patel",
    type: "link",
    ytLink: "https://www.youtube.com/watch?v=v7AYKMP6rOE",
    status: "active",
  },
  {
    name: "Meera Iyer",
    type: "link",
    ytLink: "https://www.youtube.com/watch?v=g_tea8ZNk5A",
    status: "active",
  },
  {
    name: "Vikram Singh",
    type: "link",
    ytLink: "https://www.youtube.com/watch?v=50kH47ZztHs",
    status: "active",
  },
  {
    name: "Kavita Reddy",
    type: "link",
    ytLink: "https://www.youtube.com/watch?v=tEmt1Znux58",
    status: "inactive",
  },
];

async function existingNames() {
  const seen = new Set();
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
      const name = String(item.name || "").trim().toLowerCase();
      if (name) seen.add(name);
    }

    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return seen;
}

async function main() {
  console.log("Seeding VideoTestimonials...\n");
  const seen = await existingNames();
  let created = 0;
  let skipped = 0;

  for (const row of VIDEO_TESTIMONIALS) {
    const key = String(row.name || "").trim().toLowerCase();
    if (seen.has(key)) {
      console.log(`  - skipped (exists): ${row.name}`);
      skipped += 1;
      continue;
    }

    const item = await createVideoTestimonial({
      name: row.name,
      type: row.type,
      ytLink: row.ytLink,
      profileImage: "",
      video: "",
      status: row.status,
    });

    console.log(`  ✓ ${row.name} (${row.status}) → ${item.id}`);
    created += 1;
    seen.add(key);
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message || err);
  process.exitCode = 1;
});
