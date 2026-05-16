const crypto = require("crypto");
const config = require("../config");

function generateOtp(length = config.otpLength) {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += digits[crypto.randomInt(0, digits.length)];
  }
  return code;
}

function getOtpExpiryDate() {
  const minutes = Number(config.otpExpiresMinutes) || 10;
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function isOtpExpired(otpExpire) {
  if (!otpExpire) return true;
  const t = new Date(otpExpire).getTime();
  return Number.isNaN(t) || t < Date.now();
}

/**
 * Deliver OTP (SMS/email). Replace with Twilio/SES in production.
 * Returns true when delivery is attempted.
 */
async function deliverOtp({ phoneCountryCode, phone, email, otp }) {
  const target = email || `${phoneCountryCode || ""} ${phone || ""}`.trim();
  if (config.nodeEnv !== "production") {
    console.info(`[OTP] Login code for ${target}: ${otp}`);
    return true;
  }
  // TODO: integrate SMS/email provider
  console.info(`[OTP] Sent to ${target}`);
  return true;
}

module.exports = {
  generateOtp,
  getOtpExpiryDate,
  isOtpExpired,
  deliverOtp,
};
