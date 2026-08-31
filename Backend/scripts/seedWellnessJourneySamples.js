/**
 * Patch wellnessJourneyFor + dietaryPreference on existing test users (no wipe).
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedWellnessJourneySamples.js
 *   node --use-system-ca scripts/seedWellnessJourneySamples.js --dry-run
 *
 * Best for quick local testing of Admin → Personal Details → Wellness journey for.
 */
require("dotenv").config();

const { getUserByEmail, updateUser } = require("../models/userModel");

const SAMPLES = [
  {
    email: "test.diabetes@irwellness.local",
    dietaryPreference: "vegetarian",
    wellnessJourneyFor: ["diabetes_reversal"],
  },
  {
    email: "test.fatloss@irwellness.local",
    dietaryPreference: "non_vegetarian",
    wellnessJourneyFor: ["fat_loss"],
  },
  {
    email: "test.thyroid@irwellness.local",
    dietaryPreference: "eggetarian",
    wellnessJourneyFor: ["thyroid", "hypertension"],
  },
  {
    email: "test.pcod@irwellness.local",
    dietaryPreference: "vegetarian",
    wellnessJourneyFor: [{ title: "PCOD / PCOS" }, { title: "Fat Loss" }],
  },
  {
    email: "test.hypertension@irwellness.local",
    dietaryPreference: "jain",
    wellnessJourneyFor: ["hypertension", "diabetes_reversal", "fat_loss"],
  },
  {
    email: "test.everyday@irwellness.local",
    dietaryPreference: "vegan",
    wellnessJourneyFor: ["everyday_wellness"],
  },
  {
    email: "test.multi@irwellness.local",
    dietaryPreference: "vegetarian",
    wellnessJourneyFor: ["Diabetes", "Thyroid", "Hypertension"],
  },
  {
    email: "test.seek@irwellness.local",
    dietaryPreference: "vegetarian",
    wellnessJourneyFor: ["fat_loss", "everyday_wellness"],
  },
];

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function run() {
  const dryRun = hasFlag("--dry-run");
  let updated = 0;
  let missing = 0;

  console.log(dryRun ? "=== DRY RUN ===" : "=== PATCH WELLNESS JOURNEY SAMPLES ===\n");

  for (const row of SAMPLES) {
    const user = await getUserByEmail(row.email);
    if (!user) {
      console.log(`  skip ${row.email} — user not found (run seed:test-users first)`);
      missing += 1;
      continue;
    }

    const payload = {
      dietaryPreference: row.dietaryPreference,
      wellnessJourneyFor: row.wellnessJourneyFor,
    };

    if (dryRun) {
      console.log(`  would patch ${row.email}:`, payload);
    } else {
      await updateUser(user.id, payload);
      console.log(`  patched ${row.email} (${user.name})`);
    }
    updated += 1;
  }

  console.log(`\nDone. ${updated} user(s) ${dryRun ? "would be" : ""} patched, ${missing} missing.`);
  if (missing) {
    console.log("Missing users: npm run seed:test-users -- --confirm");
  }
  console.log("\nView in Admin: Users → client → Personal Details → Wellness journey for");
  console.log("Best multi-value test: test.multi@irwellness.local → Diabetes, Thyroid, Hypertension");
}

run().catch((err) => {
  console.error("Patch failed:", err);
  process.exitCode = 1;
});
