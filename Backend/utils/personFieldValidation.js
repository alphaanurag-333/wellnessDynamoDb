const PERSON_NAME_MAX_LEN = 35;
const DOB_MIN_AGE_YEARS = 5;
const DOB_MAX_AGE_YEARS = 100;
const LOCATION_NAME_MAX_LEN = 80;
const AppError = require("./AppError");
const PERSON_NAME_ALLOWED_PATTERN = /^[\p{L}][\p{L}\s'.\-]*$/u;
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toLocalDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function maxAllowedDobIso(yearsBack = DOB_MIN_AGE_YEARS) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setFullYear(date.getFullYear() - yearsBack);
  return toLocalDateOnly(date);
}

function minAllowedDobIso(yearsBack = DOB_MAX_AGE_YEARS) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setFullYear(date.getFullYear() - yearsBack);
  return toLocalDateOnly(date);
}

function parseDateOfBirthIso(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const display = raw.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!display) return "";
  const month = MONTHS_SHORT.findIndex((m) => m.toLowerCase() === display[2].toLowerCase());
  if (month < 0) return "";
  const day = String(Number(display[1])).padStart(2, "0");
  const mon = String(month + 1).padStart(2, "0");
  return `${display[3]}-${mon}-${day}`;
}

function isValidCalendarDate(iso) {
  const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function validatePersonName(name, { label = "Full name", minLen = 2, maxLen = PERSON_NAME_MAX_LEN } = {}) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed || trimmed.length < minLen) {
    return `${label} is required (at least ${minLen} characters).`;
  }
  if (trimmed.length > maxLen) {
    return `${label} must be at most ${maxLen} characters.`;
  }
  if (/\d/.test(trimmed)) return `${label} cannot contain numbers.`;
  if (!PERSON_NAME_ALLOWED_PATTERN.test(trimmed)) {
    return `${label} may only contain letters, spaces, hyphens (-), apostrophes ('), and periods (.).`;
  }
  return "";
}

function validateDateOfBirth(
  value,
  { label = "Date of birth", required = true, minAgeYears = DOB_MIN_AGE_YEARS, maxAgeYears = DOB_MAX_AGE_YEARS } = {},
) {
  const iso = parseDateOfBirthIso(value);
  if (!iso) return required ? `${label} is required.` : "";
  if (!isValidCalendarDate(iso)) return `Enter a valid ${label.toLowerCase()}.`;
  const minIso = minAllowedDobIso(maxAgeYears);
  const maxIso = maxAllowedDobIso(minAgeYears);
  if (iso < minIso) {
    return `${label} is too far in the past (maximum age is ${maxAgeYears} years).`;
  }
  if (iso > maxIso) {
    return `${label} must be at least ${minAgeYears} years ago.`;
  }
  return "";
}

function assertValidPersonName(name, options = {}) {
  const message = validatePersonName(name, options);
  if (message) throw new AppError(message, 400);
  return String(name ?? "").trim();
}

function assertValidDateOfBirth(value, options = {}) {
  const message = validateDateOfBirth(value, options);
  if (message) throw new AppError(message, 400);
  const iso = parseDateOfBirthIso(value);
  return iso ? `${iso}T00:00:00.000Z` : null;
}

function validateLocationName(value, { label = "Location", required = true } = {}) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return required ? `${label} is required.` : "";
  if (trimmed.length < 2) return `${label} must be at least 2 characters.`;
  if (trimmed.length > LOCATION_NAME_MAX_LEN) {
    return `${label} must be at most ${LOCATION_NAME_MAX_LEN} characters.`;
  }
  return "";
}

function assertValidLocationCountry(value) {
  const message = validateLocationName(value, { label: "Country" });
  if (message) throw new AppError(message, 400);
  return String(value).trim();
}

function assertValidLocationState(value) {
  const message = validateLocationName(value, { label: "State / region" });
  if (message) throw new AppError(message, 400);
  return String(value).trim();
}

function assertValidLocationCity(value) {
  const message = validateLocationName(value, { label: "City" });
  if (message) throw new AppError(message, 400);
  return String(value).trim();
}

module.exports = {
  PERSON_NAME_MAX_LEN,
  DOB_MIN_AGE_YEARS,
  DOB_MAX_AGE_YEARS,
  validatePersonName,
  validateDateOfBirth,
  parseDateOfBirthIso,
  assertValidPersonName,
  assertValidDateOfBirth,
  assertValidLocationCountry,
  assertValidLocationState,
  assertValidLocationCity,
};
