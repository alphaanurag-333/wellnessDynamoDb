export const PERSON_NAME_MAX_LEN = 35;
export const PHONE_NATIONAL_LEN = 10;
export const EMAIL_MAX_LEN = 50;
export const DOB_MIN_AGE_YEARS = 5;
export const DOB_MAX_AGE_YEARS = 100;

export const PERSON_NAME_ALLOWED_PATTERN = /^[\p{L}][\p{L}\s'.\-]*$/u;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function toLocalDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function maxAllowedDobIso(yearsBack = DOB_MIN_AGE_YEARS) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setFullYear(date.getFullYear() - yearsBack);
  return toLocalDateOnly(date);
}

export function minAllowedDobIso(yearsBack = DOB_MAX_AGE_YEARS) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setFullYear(date.getFullYear() - yearsBack);
  return toLocalDateOnly(date);
}

/** Parse YYYY-MM-DD or display DOB ("12 Mar 1991") into a calendar ISO date. */
export function parseDateOfBirthIso(value) {
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

export function isValidCalendarDate(iso) {
  const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function validateDateOfBirth(
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

export function sanitizePersonName(raw, maxLen = PERSON_NAME_MAX_LEN) {
  const collapsed = String(raw ?? "").replace(/\s{2,}/g, " ");
  const cleaned = collapsed.replace(/[^\p{L}\s'.\-]/gu, "");
  return cleaned.slice(0, maxLen);
}

export function sanitizePhoneDigits(raw, maxLen = PHONE_NATIONAL_LEN) {
  return String(raw ?? "").replace(/\D/g, "").slice(0, maxLen);
}

export const PINCODE_LEN = 6;
export const INDIAN_PINCODE_PATTERN = /^[1-9]\d{5}$/;

export function sanitizePincode(raw, maxLen = 12) {
  return String(raw ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(0, maxLen);
}

export function validatePincode(pincode, { label = "Pin code", required = true, country = "India" } = {}) {
  const trimmed = String(pincode ?? "").trim();
  if (!trimmed) return required ? `${label} is required.` : "";
  if (country === "India") {
    if (!/^\d+$/.test(trimmed)) return `${label} should contain digits only.`;
    if (trimmed.length !== PINCODE_LEN) {
      return `${label} must be exactly ${PINCODE_LEN} digits.`;
    }
    if (!INDIAN_PINCODE_PATTERN.test(trimmed)) {
      return `${label} is not valid.`;
    }
    return "";
  }
  if (trimmed.length < 3 || trimmed.length > 12) {
    return `${label} must be 3–12 characters.`;
  }
  return "";
}

export function sanitizeEmailInput(raw, maxLen = EMAIL_MAX_LEN) {
  return String(raw ?? "").slice(0, maxLen);
}

export function validateEmail(email, { label = "Email", required = true } = {}) {
  const trimmed = String(email ?? "").trim();
  if (!trimmed) return required ? `${label} is required.` : "";
  if (trimmed.length > EMAIL_MAX_LEN) {
    return `${label} must be at most ${EMAIL_MAX_LEN} characters.`;
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return `Enter a valid ${label.toLowerCase()} address.`;
  }
  return "";
}

export function validatePersonName(
  name,
  { label = "Full name", minLen = 2, maxLen = PERSON_NAME_MAX_LEN } = {},
) {
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

export function validatePhoneDigits(phone, { label = "Mobile number", countryCode = "+91" } = {}) {
  const trimmed = String(phone ?? "").trim();
  if (!trimmed) return `${label} is required.`;
  if (!/^\d+$/.test(trimmed)) return `${label} should contain digits only.`;
  const cc = String(countryCode || "+91").startsWith("+")
    ? String(countryCode)
    : `+${countryCode}`;
  if (cc === "+91") {
    if (trimmed.length !== PHONE_NATIONAL_LEN) {
      return `${label} must be exactly ${PHONE_NATIONAL_LEN} digits.`;
    }
    if (/^(\d)\1{9}$/.test(trimmed)) {
      return `${label} is not valid.`;
    }
    if (!INDIAN_MOBILE_PATTERN.test(trimmed)) {
      return `${label} must start with 6, 7, 8, or 9.`;
    }
    return "";
  }
  if (trimmed.length < 6 || trimmed.length > 15) {
    return `${label} must be 6–15 digits.`;
  }
  if (/^(\d)\1+$/.test(trimmed)) {
    return `${label} is not valid.`;
  }
  return "";
}

export function blockPersonNameDigitKeyDown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length === 1 && /\d/.test(e.key)) e.preventDefault();
}

export function blockPhoneNonDigitKeyDown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length === 1 && !/\d/.test(e.key)) e.preventDefault();
}

export function blockIndianMobileFirstDigitKeyDown(e) {
  blockPhoneNonDigitKeyDown(e);
  if (e.defaultPrevented) return;
  if (e.key.length !== 1 || !/\d/.test(e.key)) return;
  const el = e.currentTarget;
  const val = el.value ?? "";
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const atFirstDigit = start === 0 && (val.length === 0 || (start === 0 && end === val.length));
  if (atFirstDigit && !/[6-9]/.test(e.key)) {
    e.preventDefault();
  }
}
