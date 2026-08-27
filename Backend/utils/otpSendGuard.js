const AppError = require("./AppError");
const config = require("../config");

function getOtpSendLimits() {
  return {
    maxSends: Number(config.otpMaxSendsBeforeCooldown) || 3,
    cooldownMinutes: Number(config.otpCooldownMinutes) || 10,
  };
}

function parseCooldownUntil(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * Validate whether another OTP send is allowed.
 * After `maxSends` successful sends, a cooldown window starts.
 */
function assertOtpSendAllowed({ sendCount = 0, cooldownUntil } = {}) {
  const { maxSends, cooldownMinutes } = getOtpSendLimits();
  const now = Date.now();
  const cooldownMsEnd = parseCooldownUntil(cooldownUntil);

  if (cooldownMsEnd > now) {
    const retryAfterSeconds = Math.max(1, Math.ceil((cooldownMsEnd - now) / 1000));
    const minutesLeft = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    const err = new AppError(
      `Too many OTP requests. Please try again in ${minutesLeft} minute${
        minutesLeft === 1 ? "" : "s"
      }.`,
      429
    );
    err.retryAfterSeconds = retryAfterSeconds;
    err.cooldownUntil = new Date(cooldownMsEnd).toISOString();
    throw err;
  }

  // Cooldown finished — reset the counter for a fresh window.
  const effectiveCount = cooldownMsEnd > 0 && cooldownMsEnd <= now ? 0 : Number(sendCount) || 0;

  if (effectiveCount >= maxSends) {
    const nextCooldownUntil = new Date(now + cooldownMinutes * 60 * 1000).toISOString();
    const retryAfterSeconds = cooldownMinutes * 60;
    const err = new AppError(
      `Too many OTP requests. Please try again in ${cooldownMinutes} minute${
        cooldownMinutes === 1 ? "" : "s"
      }.`,
      429
    );
    err.retryAfterSeconds = retryAfterSeconds;
    err.cooldownUntil = nextCooldownUntil;
    throw err;
  }

  return { effectiveCount, maxSends, cooldownMinutes };
}

/**
 * Build the next send-count / cooldown state after a successful OTP delivery.
 * The Nth send (where N === maxSends) starts the cooldown window.
 */
function buildNextOtpSendState(effectiveCount) {
  const { maxSends, cooldownMinutes } = getOtpSendLimits();
  const nextCount = (Number(effectiveCount) || 0) + 1;

  if (nextCount >= maxSends) {
    return {
      otpSendCount: nextCount,
      otpCooldownUntil: new Date(Date.now() + cooldownMinutes * 60 * 1000).toISOString(),
    };
  }

  return {
    otpSendCount: nextCount,
    otpCooldownUntil: null,
  };
}

function clearOtpSendState() {
  return {
    otpSendCount: 0,
    otpCooldownUntil: null,
  };
}

module.exports = {
  getOtpSendLimits,
  assertOtpSendAllowed,
  buildNextOtpSendState,
  clearOtpSendState,
};
