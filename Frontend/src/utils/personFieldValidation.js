export const PERSON_NAME_MAX_LEN = 35;
export const PHONE_NATIONAL_LEN = 10;
export const EMAIL_MAX_LEN = 50;

export const PERSON_NAME_ALLOWED_PATTERN = /^[\p{L}][\p{L}\s'.\-]*$/u;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Indian mobile: 10 digits, first digit 6–9. */
export const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;
export const INDIAN_MOBILE_INPUT_PATTERN = "[6-9][0-9]{9}";

/** Letters (any script), spaces, apostrophe, hyphen, period — strips digits and other symbols. */
export function sanitizePersonName(raw, maxLen = PERSON_NAME_MAX_LEN) {
  const collapsed = String(raw ?? "").replace(/\s{2,}/g, " ");
  const cleaned = collapsed.replace(/[^\p{L}\s'.\-]/gu, "");
  return cleaned.slice(0, maxLen);
}

export function sanitizePhoneDigits(raw, maxLen = PHONE_NATIONAL_LEN) {
  return String(raw ?? "").replace(/\D/g, "").slice(0, maxLen);
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
  { label = "Full name", minLen = 2, maxLen = PERSON_NAME_MAX_LEN } = {}
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

export function validatePhoneDigits(phone, { label = "Mobile number" } = {}) {
  const trimmed = String(phone ?? "").trim();
  if (!trimmed) return `${label} is required.`;
  if (!/^\d+$/.test(trimmed)) return `${label} should contain digits only.`;
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

export function sanitizeDigitsOnly(raw, maxLen = 60) {
  return String(raw ?? "").replace(/\D/g, "").slice(0, maxLen);
}

/** Whole number 0–100 for percentage fields. */
export function sanitizePercentInput(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "").slice(0, 3);
  if (!digits) return "";
  const num = Number.parseInt(digits, 10);
  if (!Number.isFinite(num)) return "";
  return String(Math.min(100, num));
}

export function blockPersonNameDigitKeyDown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length === 1 && /\d/.test(e.key)) e.preventDefault();
}

export function blockPhoneNonDigitKeyDown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length === 1 && !/\d/.test(e.key)) e.preventDefault();
}

/** Block 0–5 as the first digit of an Indian mobile number. */
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
