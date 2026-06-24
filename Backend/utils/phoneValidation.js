const AppError = require("./AppError");

const PHONE_NATIONAL_LEN = 10;
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

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

function assertValidIndianMobile(phone, { field = "phone" } = {}) {
  const err = validateIndianMobile(phone, { label: field });
  if (err) throw new AppError(err, 400);
}

module.exports = {
  PHONE_NATIONAL_LEN,
  INDIAN_MOBILE_PATTERN,
  validateIndianMobile,
  assertValidIndianMobile,
};
