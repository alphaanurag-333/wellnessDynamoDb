/**
 * Run the daily birthday notification + post job.
 *
 * Usage (from Backend/):
 *   node scripts/runBirthdayJob.js
 *   node scripts/runBirthdayJob.js --date=2026-06-22
 */
require("dotenv").config();

const { connectDatabase } = require("../config/db");
const { runBirthdayJob } = require("../services/birthdayJobService");

function parseDateArg() {
  const arg = process.argv.find((a) => a.startsWith("--date="));
  if (!arg) return undefined;
  return arg.replace("--date=", "").trim();
}

async function main() {
  await connectDatabase();
  const dateOnly = parseDateArg();
  const result = await runBirthdayJob(dateOnly ? { dateOnly } : {});
  console.log(`Birthday job for ${result.dateOnly} (timezone: ${result.timezone})`);
  console.log(`Matched ${result.matchedUsers} user(s) by dob on month-day(s): ${(result.monthDays || []).join(", ")}`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("Birthday job failed:", err.message);
  process.exitCode = 1;
});
