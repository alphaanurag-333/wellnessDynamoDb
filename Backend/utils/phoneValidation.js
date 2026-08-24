const AppError = require("./AppError");
const {
  isValidPhoneNumber,
  getCountries,
  getCountryCallingCode,
  Metadata,
  getExampleNumber,
} = require("libphonenumber-js");
const examples = require("libphonenumber-js/mobile/examples");

const DEFAULT_PHONE_MAX_LENGTH = 15;
const DEFAULT_PHONE_MIN_LENGTH = 4;

function normalizeDial(countryCode) {
  const raw = String(countryCode || "").trim().replace(/\s+/g, "");
  if (!raw) return "+91";
  return raw.startsWith("+") ? raw : `+${raw}`;
}

function dialDigits(countryCode) {
  return normalizeDial(countryCode).replace(/\D/g, "");
}

function countriesForDial(countryCode) {
  const digits = dialDigits(countryCode);
  if (!digits) return [];
  try {
    return getCountries().filter((c) => getCountryCallingCode(c) === digits);
  } catch {
    return [];
  }
}

function getMobileLengthBounds(countryIso) {
  const iso = String(countryIso || "")
    .trim()
    .toUpperCase();
  if (!iso || iso.length !== 2) return null;

  try {
    const metadata = new Metadata();
    metadata.selectNumberingPlan(iso);
    for (const typeName of ["MOBILE", "FIXED_LINE_OR_MOBILE"]) {
      const type = metadata.numberingPlan?.type?.(typeName);
      const lengths = type?.possibleLengths?.();
      if (lengths?.length) {
        return { min: Math.min(...lengths), max: Math.max(...lengths) };
      }
    }
  } catch {
    // fall through
  }

  try {
    const example = getExampleNumber(iso, examples);
    if (example?.nationalNumber) {
      const len = example.nationalNumber.length;
      return { min: len, max: len };
    }
  } catch {
    // ignore
  }

  return null;
}

function getPhoneMaxLengthForIso(countryIso) {
  return getMobileLengthBounds(countryIso)?.max ?? DEFAULT_PHONE_MAX_LENGTH;
}

function isValidForDial(phone, countryCode) {
  const countries = countriesForDial(countryCode);
  if (!countries.length) {
    const len = phone.length;
    return len >= DEFAULT_PHONE_MIN_LENGTH && len <= DEFAULT_PHONE_MAX_LENGTH;
  }
  return countries.some((iso) => {
    try {
      return isValidPhoneNumber(phone, iso);
    } catch {
      return false;
    }
  });
}

function isValidForIso(phone, countryIso) {
  const iso = String(countryIso || "")
    .trim()
    .toUpperCase();
  if (!iso || iso.length !== 2) return false;
  try {
    return isValidPhoneNumber(phone, iso);
  } catch {
    return false;
  }
}

/** India-only helper (kept for older call sites). */
function validateIndianMobile(phone, { label = "phone" } = {}) {
  return validateMobile(phone, { label, countryCode: "+91", countryIso: "IN" });
}

/**
 * Validate national phone digits against selected country.
 * Prefer countryIso when available; otherwise resolve by dial code.
 */
function validateMobile(
  phone,
  { label = "phone", countryCode, countryIso } = {},
) {
  const trimmed = String(phone ?? "").trim();
  if (!trimmed) return `${label} is required`;
  if (!/^\d+$/.test(trimmed)) return `${label} must contain digits only`;
  if (/^(\d)\1+$/.test(trimmed)) return `${label} is not valid`;

  const iso = String(countryIso || "")
    .trim()
    .toUpperCase();
  if (iso) {
    const maxLen = getPhoneMaxLengthForIso(iso);
    if (trimmed.length > maxLen) {
      return `${label} must be at most ${maxLen} digits`;
    }
    if (!isValidForIso(trimmed, iso)) {
      return `${label} is not valid for the selected country`;
    }
    return null;
  }

  const cc = normalizeDial(countryCode);
  const countries = countriesForDial(cc);
  if (countries.length) {
    const maxLen = Math.max(
      ...countries.map((c) => getPhoneMaxLengthForIso(c)),
      DEFAULT_PHONE_MIN_LENGTH,
    );
    if (trimmed.length > maxLen) {
      return `${label} must be at most ${maxLen} digits`;
    }
  } else if (
    trimmed.length < DEFAULT_PHONE_MIN_LENGTH ||
    trimmed.length > DEFAULT_PHONE_MAX_LENGTH
  ) {
    return `${label} must be ${DEFAULT_PHONE_MIN_LENGTH}–${DEFAULT_PHONE_MAX_LENGTH} digits`;
  }

  if (!isValidForDial(trimmed, cc)) {
    return `${label} is not valid for the selected country code`;
  }
  return null;
}

function assertValidIndianMobile(phone, { field = "phone" } = {}) {
  const err = validateIndianMobile(phone, { label: field });
  if (err) throw new AppError(err, 400);
}

function assertValidMobile(
  phone,
  { field = "phone", countryCode, countryIso } = {},
) {
  const err = validateMobile(phone, {
    label: field,
    countryCode,
    countryIso,
  });
  if (err) throw new AppError(err, 400);
}

module.exports = {
  DEFAULT_PHONE_MAX_LENGTH,
  DEFAULT_PHONE_MIN_LENGTH,
  normalizeDial,
  countriesForDial,
  getPhoneMaxLengthForIso,
  validateIndianMobile,
  validateMobile,
  assertValidIndianMobile,
  assertValidMobile,
};
