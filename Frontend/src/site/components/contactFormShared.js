import { Country } from "country-state-city";
import {
  blockIndianMobileFirstDigitKeyDown,
  blockPersonNameDigitKeyDown,
  blockPhoneNonDigitKeyDown,
  INDIAN_MOBILE_PATTERN,
  sanitizeEmailInput,
  sanitizePersonName,
  sanitizePhoneDigits,
} from "../../utils/personFieldValidation.js";

export const FIELD_LIMITS = {
  firstName: 20,
  lastName: 20,
  email: 50,
  message: 500,
  phoneNational: 15,
  phoneNationalIndia: 10,
};

export const DEFAULT_ISO = "IN";
export const DEFAULT_DIAL = "+91";

export const ALL_COUNTRIES = Country.sortByIsoCode([...Country.getAllCountries()]);

export const INITIAL_CONTACT_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phoneCountryIso: DEFAULT_ISO,
  phoneCountryCode: DEFAULT_DIAL,
  phone: "",
  inquiry: "",
  message: "",
};

export function dialCodeFromPhonecode(phonecode) {
  const raw = String(phonecode ?? "").trim();
  if (!raw) return "";
  return raw.startsWith("+") ? raw : `+${raw}`;
}

export function isIndiaDial(code) {
  const normalized = String(code ?? "").trim().replace(/\s+/g, "");
  return normalized === "+91" || normalized === "91";
}

export function sanitizeContactName(raw, maxLen = FIELD_LIMITS.firstName) {
  return sanitizePersonName(raw, maxLen);
}

export function sanitizeContactEmail(raw) {
  return sanitizeEmailInput(raw, FIELD_LIMITS.email);
}

export function sanitizeContactPhone(raw, countryCode) {
  const maxLen = isIndiaDial(countryCode) ? FIELD_LIMITS.phoneNationalIndia : FIELD_LIMITS.phoneNational;
  return sanitizePhoneDigits(raw, maxLen);
}

export function validateContactForm(form) {
  const errors = {};

  const firstName = String(form.firstName ?? "").trim();
  if (!firstName || firstName.length < 2) {
    errors.firstName = "First name is required (at least 2 characters).";
  } else if (firstName.length > FIELD_LIMITS.firstName) {
    errors.firstName = `First name must be at most ${FIELD_LIMITS.firstName} characters.`;
  } else if (/\d/.test(firstName)) {
    errors.firstName = "First name cannot contain numbers.";
  }

  const lastName = String(form.lastName ?? "").trim();
  if (!lastName || lastName.length < 2) {
    errors.lastName = "Last name is required (at least 2 characters).";
  } else if (lastName.length > FIELD_LIMITS.lastName) {
    errors.lastName = `Last name must be at most ${FIELD_LIMITS.lastName} characters.`;
  } else if (/\d/.test(lastName)) {
    errors.lastName = "Last name cannot contain numbers.";
  }

  const email = String(form.email ?? "").trim();
  if (!email) {
    errors.email = "Email address is required.";
  } else if (email.length > FIELD_LIMITS.email) {
    errors.email = `Email must be at most ${FIELD_LIMITS.email} characters.`;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  const countryCode = String(form.phoneCountryCode ?? "").trim();
  if (!countryCode || !/^\+\d{1,4}$/.test(countryCode.replace(/\s+/g, ""))) {
    errors.phone = "Select a valid country code.";
  } else {
    const phone = String(form.phone ?? "").trim();
    if (!phone) {
      errors.phone = "Phone number is required.";
    } else if (!/^\d+$/.test(phone)) {
      errors.phone = "Phone number should contain digits only.";
    } else if (isIndiaDial(countryCode)) {
      if (phone.length !== FIELD_LIMITS.phoneNationalIndia) {
        errors.phone = "Enter a 10-digit Indian mobile number.";
      } else if (!INDIAN_MOBILE_PATTERN.test(phone)) {
        errors.phone = "Indian mobile numbers must start with 6, 7, 8, or 9.";
      } else if (/^(\d)\1{9}$/.test(phone)) {
        errors.phone = "Enter a valid mobile number.";
      }
    } else if (phone.length < 4 || phone.length > FIELD_LIMITS.phoneNational) {
      errors.phone = "Enter a valid phone number (4–15 digits).";
    }
  }

  if (!String(form.inquiry ?? "").trim()) {
    errors.inquiry = "Please select an inquiry type.";
  }

  const message = String(form.message ?? "").trim();
  if (!message || message.length < 5) {
    errors.message = "Message must be at least 5 characters.";
  } else if (message.length > FIELD_LIMITS.message) {
    errors.message = `Message must be at most ${FIELD_LIMITS.message} characters.`;
  }

  return errors;
}

export function firstContactFormError(errors) {
  const order = ["firstName", "lastName", "email", "phone", "inquiry", "message"];
  for (const key of order) {
    if (errors[key]) return errors[key];
  }
  return "";
}

export { blockIndianMobileFirstDigitKeyDown, blockPersonNameDigitKeyDown, blockPhoneNonDigitKeyDown };
