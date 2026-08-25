const crypto = require("crypto");

const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_REFERRAL_CODE_LENGTH = 8;

/** Legacy role-prefixed staff codes (still accepted): IRW-WC-470, IRW-AWC-470 */
const STAFF_REFERRAL_PREFIX_BY_ENTITY = {
  wellness_coach: "IRW-WC",
  assistant_wellness_coach: "IRW-AWC",
};
const STAFF_REFERRAL_SUFFIX_DIGITS = 3;

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

/**
 * @deprecated Staff codes now use the same random 8-char format as users.
 * Kept for callers that still pass { digits }; ignores entityType/digits.
 */
function generateStaffReferralCode(_entityType, _options = {}) {
  return generateReferralCode();
}

function isStaffReferralEntityType(entityType) {
  return Object.hasOwn(
    STAFF_REFERRAL_PREFIX_BY_ENTITY,
    String(entityType || "").toLowerCase().trim()
  );
}

/** True for legacy IRW-WC-* / IRW-AWC-* codes (still valid in the wild). */
function isStaffReferralCode(code) {
  const normalized = normalizeReferralCode(code);
  return Object.values(STAFF_REFERRAL_PREFIX_BY_ENTITY).some((prefix) =>
    normalized.startsWith(`${prefix}-`)
  );
}

/**
 * Generate a referral code for any entity (users and team members).
 * Format: 8-char random alphabet, e.g. 7WDW4JST.
 */
function generateReferralCodeForEntity(_entityType, _options = {}) {
  return generateReferralCode();
}

module.exports = {
  REFERRAL_CODE_ALPHABET,
  DEFAULT_REFERRAL_CODE_LENGTH,
  STAFF_REFERRAL_PREFIX_BY_ENTITY,
  STAFF_REFERRAL_SUFFIX_DIGITS,
  normalizeReferralCode,
  generateReferralCode,
  generateStaffReferralCode,
  generateReferralCodeForEntity,
  isStaffReferralEntityType,
  isStaffReferralCode,
};
