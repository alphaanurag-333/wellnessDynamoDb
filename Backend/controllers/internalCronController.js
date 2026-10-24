const { asyncHandler } = require("../utils/asyncHandler");
const {
  executeDailyReflectionBedtimeJob,
} = require("../jobs/dailyReflectionBedtimeCron");

exports.runDailyReflectionBedtimeCronController = asyncHandler(async (req, res) => {
  const result = await executeDailyReflectionBedtimeJob("http");
  return res.status(200).json({
    status: true,
    message: result
      ? `Daily reflection bedtime job completed at ${result.nowClock} (${result.timezone})`
      : "Daily reflection bedtime job skipped (already running)",
    result,
  });
});
