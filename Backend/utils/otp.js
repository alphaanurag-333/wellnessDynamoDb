const crypto = require("crypto");
const config = require("../config");
const AppError = require("./AppError");
const { sendWhatsAppOtp } = require("./whatsapp");

/** Review / demo numbers that skip WhatsApp and use a fixed OTP. */
const STATIC_OTP_BY_PHONE = Object.freeze({
  "9876543210": "123456",
});

function nationalOtpPhone(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

function staticOtpForPhone(phone) {
  return STATIC_OTP_BY_PHONE[nationalOtpPhone(phone)] || null;
}

function isStaticOtpPhone(phone) {
  return Boolean(staticOtpForPhone(phone));
}

function isValidStaticOtp(phone, otp) {
  const expected = staticOtpForPhone(phone);
  return Boolean(expected && String(otp ?? "").trim() === expected);
}

function anyStaticOtpMatch(otp, phones = []) {
  return phones.some((phone) => isValidStaticOtp(phone, otp));
}

function generateOtp(length = config.otpLength) {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += digits[crypto.randomInt(0, digits.length)];
  }
  return code;
}

function resolveOtp(phone, length) {
  return staticOtpForPhone(phone) || generateOtp(length);
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
  if (isStaticOtpPhone(phone)) {
    console.info(`[OTP] static test OTP for ${target}`);
    return true;
  }

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
  resolveOtp,
  getOtpExpiryDate,
  isOtpExpired,
  isStaticOtpPhone,
  isValidStaticOtp,
  anyStaticOtpMatch,
  deliverOtp,
};
