export const PERSON_NAME_MAX_LEN = 35;
export const PHONE_NATIONAL_LEN = 10;
export const EMAIL_MAX_LEN = 50;

export const PERSON_NAME_ALLOWED_PATTERN = /^[\p{L}][\p{L}\s'.\-]*$/u;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
