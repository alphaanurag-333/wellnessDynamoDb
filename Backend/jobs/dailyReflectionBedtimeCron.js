const cron = require("node-cron");

const config = require("../config");
const { runDailyReflectionBedtimeJob } = require("../services/dailyReflectionBedtimeJobService");

let scheduledTask = null;
let running = false;

async function executeDailyReflectionBedtimeJob(trigger = "cron") {
  if (running) {
    console.warn(
      `[daily-reflection-bedtime-cron] Skipping (${trigger}) — previous run still in progress`
    );
    return null;
  }

  running = true;
  try {
    const result = await runDailyReflectionBedtimeJob();
    if (result.matchedUsers > 0 || result.failed > 0) {
      console.log(
        `[daily-reflection-bedtime-cron] Completed (${trigger}) at ${result.nowClock} [${result.timezone}]: ` +
          `matched=${result.matchedUsers}, sent=${result.sent}, skipped=${result.skipped}, failed=${result.failed}`
      );
    }
    return result;
  } catch (err) {
    console.error(`[daily-reflection-bedtime-cron] Failed (${trigger}):`, err?.message || err);
    return null;
  } finally {
    running = false;
  }
}

function startDailyReflectionBedtimeCron() {
  if (!config.dailyReflectionBedtimeCronEnabled) {
    console.log(
      "[daily-reflection-bedtime-cron] Disabled (set DAILY_REFLECTION_BEDTIME_CRON_ENABLED=true to enable)"
    );
    return null;
  }

  if (!cron.validate(config.dailyReflectionBedtimeCronSchedule)) {
    console.error(
      `[daily-reflection-bedtime-cron] Invalid schedule "${config.dailyReflectionBedtimeCronSchedule}" — cron not started`
    );
    return null;
  }

  if (scheduledTask) return scheduledTask;

  scheduledTask = cron.schedule(
    config.dailyReflectionBedtimeCronSchedule,
    () => {
      void executeDailyReflectionBedtimeJob("cron");
    },
    {
      scheduled: true,
      timezone: config.dailyReflectionBedtimeCronTimezone,
    }
  );

  console.log(
    `[daily-reflection-bedtime-cron] Scheduled at ${config.dailyReflectionBedtimeCronSchedule} (${config.dailyReflectionBedtimeCronTimezone})`
  );

  return scheduledTask;
}

function stopDailyReflectionBedtimeCron() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

module.exports = {
  executeDailyReflectionBedtimeJob,
  startDailyReflectionBedtimeCron,
  stopDailyReflectionBedtimeCron,
};
