const crypto = require("crypto");

const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_REFERRAL_CODE_LENGTH = 8;

/** Role-prefixed staff codes: IRW-WC-470, IRW-AWC-470 */
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
 * Staff (WC / AWC) referral codes: IRW-WC-470 / IRW-AWC-470
 * Suffix defaults to three digits; callers widen it when the short space is crowded.
 */
function generateStaffReferralCode(entityType, { digits = STAFF_REFERRAL_SUFFIX_DIGITS } = {}) {
  const prefix = STAFF_REFERRAL_PREFIX_BY_ENTITY[String(entityType || "").toLowerCase().trim()];
  if (!prefix) {
    throw new Error(
      `Unsupported staff referral entityType: ${entityType}. Expected wellness_coach or assistant_wellness_coach.`
    );
  }
  const width = Math.min(Math.max(Number(digits) || STAFF_REFERRAL_SUFFIX_DIGITS, 3), 6);
  const suffix = String(crypto.randomInt(10 ** (width - 1), 10 ** width));
  return `${prefix}-${suffix}`;
}

function isStaffReferralEntityType(entityType) {
  return Object.hasOwn(
    STAFF_REFERRAL_PREFIX_BY_ENTITY,
    String(entityType || "").toLowerCase().trim()
  );
}

function isStaffReferralCode(code) {
  const normalized = normalizeReferralCode(code);
  return Object.values(STAFF_REFERRAL_PREFIX_BY_ENTITY).some((prefix) =>
    normalized.startsWith(`${prefix}-`)
  );
}

/**
 * Generate a referral code for the given entity.
 * Users keep the legacy random alphabet codes; WC/AWC use IRW-*-NNN.
 */
function generateReferralCodeForEntity(entityType, options = {}) {
  if (isStaffReferralEntityType(entityType)) {
    return generateStaffReferralCode(entityType, options);
  }
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
