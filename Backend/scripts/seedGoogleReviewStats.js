/**
 * Seed Google Review / social stats into AppConfig.
 * These values appear on the website and app About / Hero sections.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedGoogleReviewStats.js
 */
require("dotenv").config();

const { getAppConfig, updateAppConfig } = require("../models/appConfigModel");

const STATS = {
  average_rating:     "4.8",
  google_reviews:     "1,400+",
  happy_clients:      "10,000+",
  success_rate:       "94%",
  improved_user:      "10,000+",
  facebook_followers: "50,000+",
};

async function main() {
  console.log("Seeding Google Review stats into AppConfig...\n");

  const config = await getAppConfig();

  if (!config) {
    console.error("AppConfig record not found. Run POST /api/admin/app-config first.");
    process.exitCode = 1;
    return;
  }

  const toUpdate = {};
  const toSkip = [];

  for (const [key, value] of Object.entries(STATS)) {
    const existing = String(config[key] || "").trim();
    if (existing) {
      toSkip.push(`  - skipped (already set): ${key} = "${existing}"`);
    } else {
      toUpdate[key] = value;
    }
  }

  if (toSkip.length) toSkip.forEach((line) => console.log(line));

  if (Object.keys(toUpdate).length === 0) {
    console.log("\nAll stats already set. Nothing to update.");
    return;
  }

  const updated = await updateAppConfig(toUpdate);

  for (const [key, value] of Object.entries(toUpdate)) {
    console.log(`  ✓ ${key} = "${updated[key] ?? value}"`);
  }

  console.log(`\nDone: ${Object.keys(toUpdate).length} stats seeded.`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message || err);
  process.exitCode = 1;
});
