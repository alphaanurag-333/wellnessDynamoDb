/**
 * Seed LeadershipNotes with genuine active leadership messages.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedLeadershipNotes.js
 */
require("dotenv").config();

const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { createLeadershipNote, DEFAULT_BADGE } = require("../models/leadershipNoteModel");

const TABLE = "LeadershipNotes";

const LEADERSHIP_NOTES = [
  {
    name: "Ms. Banita Acharya",
    designation: "Co-Founder",
    title: "Co-Founder's Message",
    badge: DEFAULT_BADGE,
    message:
      "At IR Wellness, we believe healing begins when science and compassion walk together. Our vision is to help families reclaim vitality through personalized care — clinical clarity with holistic wisdom — so that living medicine-free becomes a realistic path, not just a hope.",
    status: "active",
  },
  {
    name: "Ms. Dipti Patil",
    designation: "Director, Sales and Client Acquisition",
    title: "Director, Sales and Client Acquisition",
    badge: DEFAULT_BADGE,
    message:
      "Every family that joins IR Wellness is choosing long-term health over short-term fixes. My focus is building trust from the first conversation — clear guidance, honest expectations, and a care experience that feels personal. When clients feel heard, transformation becomes sustainable.",
    status: "active",
  },
  {
    name: "Dr. Ananya Mehta",
    designation: "Head of Clinical Wellness",
    title: "Clinical Wellness Leadership",
    badge: DEFAULT_BADGE,
    message:
      "True wellness is not a single protocol. It is a thoughtful journey through diagnostics, lifestyle change, and continuous support. Our clinical team designs plans around each person's biology and life context — because lasting results come from personalization, not one-size-fits-all care.",
    status: "active",
  },
  {
    name: "Rahul Deshmukh",
    designation: "Director of Operations",
    title: "Operations & Care Delivery",
    badge: DEFAULT_BADGE,
    message:
      "Behind every consultation is a system designed for reliability — timely follow-ups, coach coordination, and seamless client support. We keep improving our operations so our wellness coaches can focus on what matters most: guiding people toward healthier, medicine-free lives.",
    status: "active",
  },
  {
    name: "Sneha Kulkarni",
    designation: "Head of Coach Development",
    title: "Building Our Wellness Coach Community",
    badge: DEFAULT_BADGE,
    message:
      "Our coaches are the heart of IR Wellness. We invest deeply in their training, mentorship, and growth so every client receives expert guidance with empathy. Creating strong coaches means creating stronger outcomes for the families we serve.",
    status: "active",
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
  console.log("Seeding LeadershipNotes...\n");
  const seen = await existingNames();
  let created = 0;
  let skipped = 0;

  for (const row of LEADERSHIP_NOTES) {
    const key = String(row.name || "").trim().toLowerCase();
    if (seen.has(key)) {
      console.log(`  - skipped (exists): ${row.name}`);
      skipped += 1;
      continue;
    }

    const item = await createLeadershipNote({
      name: row.name,
      designation: row.designation,
      title: row.title,
      badge: row.badge,
      message: row.message,
      profileImage: "",
      status: row.status,
    });

    console.log(`  ✓ ${row.name} (${row.designation}) → ${item.id}`);
    created += 1;
    seen.add(key);
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped.`);
  console.log("Tip: add profile images later from Admin → Leadership Notes.");
}

main().catch((err) => {
  console.error("Seed failed:", err.message || err);
  process.exitCode = 1;
});
