const cron = require("node-cron");

const config = require("../config");
const { runChallengeLifecycleJob } = require("../services/challengeAccessService");

let scheduledTask = null;
let running = false;

async function executeChallengeLifecycleJob(trigger = "cron") {
  if (running) {
    console.warn(`[challenge-lifecycle-cron] Skipping (${trigger}) — previous run still in progress`);
    return null;
  }

  running = true;
  try {
    const result = await runChallengeLifecycleJob();
    console.log(
      `[challenge-lifecycle-cron] Completed (${trigger}) for ${result.today}: ` +
        `granted=${result.granted}, completed=${result.completed}, failed=${result.failed}`
    );
    return result;
  } catch (err) {
    console.error(`[challenge-lifecycle-cron] Failed (${trigger}):`, err?.message || err);
    return null;
  } finally {
    running = false;
  }
}

function startChallengeLifecycleCron() {
  if (!config.challengeLifecycleCronEnabled) {
    console.log(
      "[challenge-lifecycle-cron] Disabled (set CHALLENGE_LIFECYCLE_CRON_ENABLED=true to enable)"
    );
    return null;
  }

  if (!cron.validate(config.challengeLifecycleCronSchedule)) {
    console.error(
      `[challenge-lifecycle-cron] Invalid schedule "${config.challengeLifecycleCronSchedule}" — cron not started`
    );
    return null;
  }

  if (scheduledTask) return scheduledTask;

  scheduledTask = cron.schedule(
    config.challengeLifecycleCronSchedule,
    () => {
      void executeChallengeLifecycleJob("cron");
    },
    {
      scheduled: true,
      timezone: config.challengeLifecycleCronTimezone,
    }
  );

  console.log(
    `[challenge-lifecycle-cron] Scheduled at ${config.challengeLifecycleCronSchedule} (${config.challengeLifecycleCronTimezone})`
  );

  return scheduledTask;
}

function stopChallengeLifecycleCron() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

module.exports = {
  executeChallengeLifecycleJob,
  startChallengeLifecycleCron,
  stopChallengeLifecycleCron,
};
