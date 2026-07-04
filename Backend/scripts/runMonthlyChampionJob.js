/**
 * Run the monthly champion ranking + notification job manually.
 *
 * Usage (from Backend/):
 *   node scripts/runMonthlyChampionJob.js
 *   node scripts/runMonthlyChampionJob.js --month=2026-06
 */
require("dotenv").config();

const { connectDatabase } = require("../config/db");
const { runMonthlyChampionJob } = require("../services/monthlyChampionJobService");

function parseMonthArg() {
  const arg = process.argv.find((a) => a.startsWith("--month="));
  if (!arg) return undefined;
  return arg.replace("--month=", "").trim();
}

async function main() {
  await connectDatabase();
  const monthYear = parseMonthArg();
  const result = await runMonthlyChampionJob(monthYear ? { monthYear } : {});
  console.log(`Monthly champion job for ${result.monthYear}`);
  console.log(
    `Matched ${result.matchedUsers} champion(s): created=${result.created}, updated=${result.updated}, failed=${result.failed}`
  );
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("Monthly champion job failed:", err.message);
  process.exitCode = 1;
});
