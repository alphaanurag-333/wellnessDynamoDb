const cron = require("node-cron");

const config = require("../config");
const { runBirthdayJob } = require("../services/birthdayJobService");

let scheduledTask = null;
let running = false;

async function executeBirthdayJob(trigger = "cron") {
  if (running) {
    console.warn(`[birthday-cron] Skipping (${trigger}) — previous run still in progress`);
    return null;
  }

  running = true;
  try {
    const result = await runBirthdayJob();
    console.log(
      `[birthday-cron] Completed (${trigger}) for ${result.dateOnly} [${result.timezone}]: ` +
        `matched=${result.matchedUsers}, sent=${result.sent}, created=${result.created}, ` +
        `retried=${result.retried}, skipped=${result.skipped}, failed=${result.failed}`
    );
    return result;
  } catch (err) {
    console.error(`[birthday-cron] Failed (${trigger}):`, err?.message || err);
    return null;
  } finally {
    running = false;
  }
}

function startBirthdayJobCron() {
  if (!config.birthdayJobCronEnabled) {
    console.log("[birthday-cron] Disabled (set BIRTHDAY_JOB_CRON_ENABLED=true to enable)");
    return null;
  }

  if (!cron.validate(config.birthdayJobCronSchedule)) {
    console.error(
      `[birthday-cron] Invalid schedule "${config.birthdayJobCronSchedule}" — cron not started`
    );
    return null;
  }

  if (scheduledTask) return scheduledTask;

  scheduledTask = cron.schedule(
    config.birthdayJobCronSchedule,
    () => {
      void executeBirthdayJob("cron");
    },
    {
      scheduled: true,
      timezone: config.birthdayJobTimezone,
    }
  );

  console.log(
    `[birthday-cron] Scheduled daily at ${config.birthdayJobCronSchedule} (${config.birthdayJobTimezone})`
  );

  return scheduledTask;
}

function stopBirthdayJobCron() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

module.exports = {
  executeBirthdayJob,
  startBirthdayJobCron,
  stopBirthdayJobCron,
};
