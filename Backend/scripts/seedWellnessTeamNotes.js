/**
 * Seed WellnessTeamNotes with genuine active team profiles.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedWellnessTeamNotes.js
 */
require("dotenv").config();

const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { createWellnessTeamNote, DEFAULT_BADGE } = require("../models/wellnessTeamNoteModel");

const TABLE = "WellnessTeamNotes";

const WELLNESS_TEAM_NOTES = [
  {
    name: "Dr. Anita Rao",
    designation: "Wellness Coach",
    title: "Lead Wellness Coach",
    badge: DEFAULT_BADGE,
    message:
      "Healing is not a crash diet or a 30-day sprint. In the first weeks of the programme we slow down, listen to your reports, sleep, stress and food patterns, then build a plan you can actually live with. My job is to walk beside you until those new habits feel like home.",
    status: "active",
  },
  {
    name: "Rahul Mehta",
    designation: "Wellness Coach",
    title: "Wellness Coach",
    badge: DEFAULT_BADGE,
    message:
      "Check-ins are where the real work happens. We review what landed, what felt hard, and adjust movement, meals and recovery so your body is not fighting the plan. Strength, rest and daily rhythm matter as much as the numbers on a report.",
    status: "active",
  },
  {
    name: "Priya Nair",
    designation: "Functional Nutritionist",
    title: "Functional Nutritionist",
    badge: DEFAULT_BADGE,
    message:
      "Food is medicine when it is personal. I look at digestion, cravings, labs and your kitchen reality — not a generic meal chart. The first weeks are about nourishing consistently, not restricting, so energy and inflammation start moving in the right direction.",
    status: "active",
  },
  {
    name: "Neha Kapoor",
    designation: "Assistant Wellness Coach",
    title: "Assistant Wellness Coach",
    badge: DEFAULT_BADGE,
    message:
      "I am the everyday voice on your programme — reminders, meal queries, and the small course-corrections between coach sessions. Settling in should feel supported, not overwhelming. Message us; we are here to keep you moving without dropping the plan.",
    status: "active",
  },
  {
    name: "Vikram Singh",
    designation: "Assistant Wellness Coach",
    title: "Assistant Wellness Coach",
    badge: DEFAULT_BADGE,
    message:
      "Once your plan is live, consistency beats intensity. I help you stay accountable on busy weeks, log meals honestly, and flag what needs the lead coach’s eye. Think of me as the teammate who keeps the programme practical day to day.",
    status: "active",
  },
  {
    name: "Meera Joshi",
    designation: "Yoga & Movement Coach",
    title: "Yoga & Movement Coach",
    badge: DEFAULT_BADGE,
    message:
      "Breath and gentle movement change how the nervous system holds stress. We start with what your joints and energy can do today — not an advanced class. Ten honest minutes of yoga and pranayama, done daily, will do more than an hour you cannot sustain.",
    status: "active",
  },
  {
    name: "Dr. Kavya Iyer",
    designation: "Ayurveda Practitioner",
    title: "Ayurveda Practitioner",
    badge: DEFAULT_BADGE,
    message:
      "Ayurveda sits beside your clinical work, not instead of it. We read prakriti, digestion and daily rhythm so diet, herbs and rest actually match your constitution. The aim is a medicine-free life that still respects your biology.",
    status: "active",
  },
  {
    name: "Sana Iqbal",
    designation: "Lifestyle Counsellor",
    title: "Lifestyle Counsellor",
    badge: DEFAULT_BADGE,
    message:
      "Sleep, screens, work hours and family meals shape outcomes as much as any protocol. I help you redesign those patterns without guilt — small, specific shifts that fit your home. When lifestyle supports the plan, the body finally has room to heal.",
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
  console.log("Seeding WellnessTeamNotes...\n");
  const seen = await existingNames();
  let created = 0;
  let skipped = 0;

  for (const row of WELLNESS_TEAM_NOTES) {
    const key = String(row.name || "").trim().toLowerCase();
    if (seen.has(key)) {
      console.log(`  - skipped (exists): ${row.name}`);
      skipped += 1;
      continue;
    }

    const item = await createWellnessTeamNote({
      name: row.name,
      designation: row.designation,
      title: row.title,
      badge: row.badge,
      message: row.message,
      profileImage: "",
      status: row.status,
      webVisible: true,
      appVisible: true,
    });

    console.log(`  ✓ ${row.name} (${row.designation}) → ${item.id}`);
    created += 1;
    seen.add(key);
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped.`);
  console.log("Tip: add portraits later from Admin → Configs → Wellness Team Profile.");
}

main().catch((err) => {
  console.error("Seed failed:", err.message || err);
  process.exitCode = 1;
});
