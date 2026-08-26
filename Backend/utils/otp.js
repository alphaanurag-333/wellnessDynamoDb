const crypto = require("crypto");
const config = require("../config");
const AppError = require("./AppError");
const { sendWhatsAppOtp } = require("./whatsapp");

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

function otpTargetLabel({ phoneCountryCode, phone, email }) {
  const mobile = `${phoneCountryCode || ""} ${phone || ""}`.trim();
  return mobile || email || "unknown";
}

/**
 * Deliver OTP over WhatsApp (Bhash AUTH template).
 * All registration / login / number-change / delete flows call this.
 */
async function deliverOtp({ phoneCountryCode, phone, email, otp }) {
  const target = otpTargetLabel({ phoneCountryCode, phone, email });
  const result = await sendWhatsAppOtp({ phoneCountryCode, phone, otp });

  if (result.sent) {
    console.info(`[OTP] WhatsApp sent to ${result.to || target}`);
    return true;
  }

  if (result.reason === "not_configured" && config.nodeEnv !== "production") {
    console.info(`[OTP] WhatsApp not configured. Code for ${target}: ${otp}`);
    return true;
  }

  if (result.reason === "missing_phone") {
    throw new AppError("A valid mobile number is required to send OTP", 400);
  }

  console.error(`[OTP] WhatsApp delivery failed for ${target}: ${result.reason}`);
  throw new AppError("Unable to send OTP via WhatsApp. Please try again.", 502);
}

module.exports = {
  generateOtp,
  getOtpExpiryDate,
  isOtpExpired,
  deliverOtp,
};
