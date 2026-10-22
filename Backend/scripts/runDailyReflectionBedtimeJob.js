/**
 * Run the daily reflection bedtime reminder job (inbox + FCM).
 *
 *   node scripts/runDailyReflectionBedtimeJob.js
 *   node scripts/runDailyReflectionBedtimeJob.js --nowClock=14:48
 *   node scripts/runDailyReflectionBedtimeJob.js --dateOnly=2026-10-22 --nowClock=14:48
 */
require("dotenv").config();

const { runDailyReflectionBedtimeJob } = require("../services/dailyReflectionBedtimeJobService");

function readArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((row) => row.startsWith(prefix));
  return hit ? hit.slice(prefix.length).trim() : "";
}

async function main() {
  const nowClock = readArg("nowClock");
  const dateOnly = readArg("dateOnly");
  const timezone = readArg("timezone");
  const options = {};
  if (nowClock) options.nowClock = nowClock;
  if (dateOnly) options.dateOnly = dateOnly;
  if (timezone) options.timezone = timezone;

  const result = await runDailyReflectionBedtimeJob(options);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
