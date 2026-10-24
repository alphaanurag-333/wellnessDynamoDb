const AppError = require("../utils/AppError");
const config = require("../config");

function requireCronSecret(req, _res, next) {
  const expected = String(config.internalCronSecret || "").trim();
  if (!expected) {
    return next(new AppError("Internal cron is not configured (INTERNAL_CRON_SECRET)", 503));
  }

  const header = String(req.get("x-cron-secret") || req.get("X-Cron-Secret") || "").trim();
  const query = String(req.query?.cronSecret || req.query?.secret || "").trim();
  const provided = header || query;

  if (!provided || provided !== expected) {
    return next(new AppError("Unauthorized cron request", 401));
  }

  return next();
}

module.exports = { requireCronSecret };
