const AppError = require("./AppError");

const PHONE_NATIONAL_LEN = 10;
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

const DIAL_NATIONAL_LEN = {
  "+91": 10,
  "+971": 9,
  "+1": 10,
  "+44": 10,
  "+65": 8,
  "+61": 9,
  "+977": 10,
  "+880": 10,
  "+94": 9,
};

function normalizeDial(countryCode) {
  const raw = String(countryCode || "").trim();
  if (!raw) return "+91";
  return raw.startsWith("+") ? raw : `+${raw}`;
}

function validateIndianMobile(phone, { label = "phone" } = {}) {
  const trimmed = String(phone ?? "").trim();
  if (!trimmed) return `${label} is required`;
  if (!/^\d+$/.test(trimmed)) return `${label} must contain digits only`;
  if (trimmed.length !== PHONE_NATIONAL_LEN) {
    return `${label} must be exactly ${PHONE_NATIONAL_LEN} digits`;
  }
  if (/^(\d)\1{9}$/.test(trimmed)) {
    return `${label} is not valid`;
  }
  if (!INDIAN_MOBILE_PATTERN.test(trimmed)) {
    return `${label} must start with 6, 7, 8, or 9`;
  }
  return null;
}

function validateMobile(phone, { label = "phone", countryCode } = {}) {
  const cc = normalizeDial(countryCode);
  if (cc === "+91") return validateIndianMobile(phone, { label });

  const trimmed = String(phone ?? "").trim();
  if (!trimmed) return `${label} is required`;
  if (!/^\d+$/.test(trimmed)) return `${label} must contain digits only`;
  const expected = DIAL_NATIONAL_LEN[cc];
  if (expected) {
    if (trimmed.length !== expected) {
      return `${label} must be exactly ${expected} digits`;
    }
  } else if (trimmed.length < 6 || trimmed.length > 15) {
    return `${label} must be 6–15 digits`;
  }
  if (/^(\d)\1+$/.test(trimmed)) {
    return `${label} is not valid`;
  }
  return null;
}

function assertValidIndianMobile(phone, { field = "phone" } = {}) {
  const err = validateIndianMobile(phone, { label: field });
  if (err) throw new AppError(err, 400);
}

function assertValidMobile(phone, { field = "phone", countryCode } = {}) {
  const err = validateMobile(phone, { label: field, countryCode });
  if (err) throw new AppError(err, 400);
}

module.exports = {
  PHONE_NATIONAL_LEN,
  INDIAN_MOBILE_PATTERN,
  DIAL_NATIONAL_LEN,
  validateIndianMobile,
  validateMobile,
  assertValidIndianMobile,
  assertValidMobile,
};
