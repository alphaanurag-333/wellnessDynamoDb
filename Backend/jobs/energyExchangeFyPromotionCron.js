const cron = require("node-cron");

const config = require("../config");
const { runEnergyExchangeFyPromotion } = require("../services/energyExchangeFyPromotionService");

let scheduledTask = null;
let running = false;

async function executeFyPromotionJob(trigger = "cron") {
  if (running) {
    console.warn(`[ee-fy-cron] Skipping (${trigger}) — previous run still in progress`);
    return null;
  }

  running = true;
  try {
    const result = await runEnergyExchangeFyPromotion(new Date());
    console.log(
      `[ee-fy-cron] Completed (${trigger}): expired=${result.expired}, activated=${result.activated}, users=${result.users}, errors=${result.errors}`
    );
    return result;
  } catch (err) {
    console.error(`[ee-fy-cron] Failed (${trigger}):`, err?.message || err);
    return null;
  } finally {
    running = false;
  }
}

function startEnergyExchangeFyPromotionCron() {
  if (!config.energyExchangeFyCronEnabled) {
    console.log(
      "[ee-fy-cron] Disabled (set ENERGY_EXCHANGE_FY_CRON_ENABLED=true to enable)"
    );
    return null;
  }

  if (!cron.validate(config.energyExchangeFyCronSchedule)) {
    console.error(
      `[ee-fy-cron] Invalid schedule "${config.energyExchangeFyCronSchedule}" — cron not started`
    );
    return null;
  }

  if (scheduledTask) return scheduledTask;

  scheduledTask = cron.schedule(
    config.energyExchangeFyCronSchedule,
    () => {
      void executeFyPromotionJob("cron");
    },
    {
      scheduled: true,
      timezone: config.energyExchangeFyCronTimezone,
    }
  );

  console.log(
    `[ee-fy-cron] Scheduled daily at ${config.energyExchangeFyCronSchedule} (${config.energyExchangeFyCronTimezone})`
  );

  return scheduledTask;
}

function stopEnergyExchangeFyPromotionCron() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

module.exports = {
  executeFyPromotionJob,
  startEnergyExchangeFyPromotionCron,
  stopEnergyExchangeFyPromotionCron,
};
