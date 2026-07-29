/**
 * Seed PhysicalExercise catalog with genuine wellness movement content.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedPhysicalExercises.js
 */
require("dotenv").config();

const { createPhysicalExercise, listPhysicalExercises } = require("../models/physicalExerciseModel");

const EXERCISES = [
  {
    title: "Brisk Walking — 20 Minutes",
    description:
      "Steady outdoor or treadmill walk at a pace where you can talk but not sing. Builds cardio base and insulin sensitivity.",
    type: "ytlink",
    link: "https://www.youtube.com/watch?v=njeZ29umqVE",
  },
  {
    title: "Bodyweight Squats",
    description:
      "Feet shoulder-width, sit back into hips, keep chest tall. 3 sets of 12–15 reps for lower-body strength.",
    type: "ytlink",
    link: "https://www.youtube.com/watch?v=YaXPRqUwItQ",
  },
  {
    title: "Wall Push-Ups",
    description:
      "Beginner upper-body strength. Hands on wall at chest height, body in a straight line. 3 sets of 10–12.",
    type: "ytlink",
    link: "https://www.youtube.com/watch?v=QgOJI0E2CEw",
  },
  {
    title: "Glute Bridge",
    description:
      "Lie on back, knees bent, lift hips by squeezing glutes. Strengthens posterior chain and supports lower back.",
    type: "ytlink",
    link: "https://www.youtube.com/watch?v=OUgsJ8-Vi0E",
  },
  {
    title: "Standing March with Arm Swing",
    description:
      "Low-impact cardio warm-up. March in place lifting knees gently while swinging opposite arms for 3–5 minutes.",
    type: "ytlink",
    link: "https://www.youtube.com/watch?v=Ev6yE55kYGw",
  },
  {
    title: "Seated Spinal Twist Stretch",
    description:
      "Mobility cool-down for desk workers. Sit tall, twist gently toward each side, hold 20–30 seconds.",
    type: "ytlink",
    link: "https://www.youtube.com/watch?v=sWA6pjMhFsw",
  },
  {
    title: "Resistance Band Rows",
    description:
      "Anchor a band at chest height, pull elbows back squeezing shoulder blades. Improves posture and upper back strength.",
    type: "ytlink",
    link: "https://www.youtube.com/watch?v=pYcpY20QaE8",
  },
  {
    title: "Step-Ups (Low Step)",
    description:
      "Alternate legs stepping onto a sturdy low step. Controlled tempo for knee-friendly strength and balance.",
    type: "ytlink",
    link: "https://www.youtube.com/watch?v=dQqApCGd5Zc",
  },
];

async function main() {
  console.log("Seeding PhysicalExercise catalog...\n");
  const { physicalExercises } = await listPhysicalExercises({ page: 1, limit: 200 });
  const existing = new Set(
    (physicalExercises || []).map((row) => String(row.title || "").trim().toLowerCase())
  );

  let created = 0;
  let skipped = 0;
  for (const row of EXERCISES) {
    if (existing.has(row.title.trim().toLowerCase())) {
      console.log(`  - skipped: ${row.title}`);
      skipped += 1;
      continue;
    }
    await createPhysicalExercise({ ...row, status: "active" });
    console.log(`  ✓ ${row.title}`);
    created += 1;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
