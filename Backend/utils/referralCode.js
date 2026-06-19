const crypto = require("crypto");

const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_REFERRAL_CODE_LENGTH = 8;

function normalizeReferralCode(code) {
  return String(code || "").trim().toUpperCase();
}

function generateReferralCode(length = DEFAULT_REFERRAL_CODE_LENGTH) {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += REFERRAL_CODE_ALPHABET[crypto.randomInt(0, REFERRAL_CODE_ALPHABET.length)];
  }
  return code;
}

module.exports = {
  REFERRAL_CODE_ALPHABET,
  DEFAULT_REFERRAL_CODE_LENGTH,
  normalizeReferralCode,
  generateReferralCode,
};
