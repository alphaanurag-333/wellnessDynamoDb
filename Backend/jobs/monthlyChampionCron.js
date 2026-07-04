const cron = require("node-cron");

const config = require("../config");
const { runMonthlyChampionJob } = require("../services/monthlyChampionJobService");

let scheduledTask = null;
let running = false;

async function executeMonthlyChampionJob(trigger = "cron", options = {}) {
  if (running) {
    console.warn(`[monthly-champion-cron] Skipping (${trigger}) — previous run still in progress`);
    return null;
  }

  running = true;
  try {
    const result = await runMonthlyChampionJob(options);
    console.log(
      `[monthly-champion-cron] Completed (${trigger}) for ${result.monthYear}: ` +
        `matched=${result.matchedUsers}, created=${result.created}, updated=${result.updated}, failed=${result.failed}`
    );
    return result;
  } catch (err) {
    console.error(`[monthly-champion-cron] Failed (${trigger}):`, err?.message || err);
    return null;
  } finally {
    running = false;
  }
}

function startMonthlyChampionCron() {
  if (!config.monthlyChampionCronEnabled) {
    console.log("[monthly-champion-cron] Disabled (set MONTHLY_CHAMPION_CRON_ENABLED=true to enable)");
    return null;
  }

  if (!cron.validate(config.monthlyChampionCronSchedule)) {
    console.error(
      `[monthly-champion-cron] Invalid schedule "${config.monthlyChampionCronSchedule}" — cron not started`
    );
    return null;
  }

  if (scheduledTask) return scheduledTask;

  scheduledTask = cron.schedule(
    config.monthlyChampionCronSchedule,
    () => {
      void executeMonthlyChampionJob("cron");
    },
    {
      scheduled: true,
      timezone: config.monthlyChampionCronTimezone,
    }
  );

  console.log(
    `[monthly-champion-cron] Scheduled at ${config.monthlyChampionCronSchedule} (${config.monthlyChampionCronTimezone})`
  );

  return scheduledTask;
}

function stopMonthlyChampionCron() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

module.exports = {
  executeMonthlyChampionJob,
  startMonthlyChampionCron,
  stopMonthlyChampionCron,
};
