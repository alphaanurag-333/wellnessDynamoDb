import { City, Country, State } from "country-state-city";
import {
  sanitizePersonName,
  validateEmail,
  validatePersonName,
  validatePhoneDigits,
} from "../../../utils/personFieldValidation.js";
import {
  PROFILE_PASSWORD_MAX_LEN,
  PROFILE_PASSWORD_MIN_LEN,
  validateRegistrationConfirmPassword,
  validateRegistrationPassword,
} from "../../../utils/profilePasswordValidation.js";

export { formatDate } from "../../utils/formatDate.js";
export const LIST_LIMIT = 10;
export const LIST_SEARCH_MAX_LEN = 120;
export { PERSON_NAME_MAX_LEN as NAME_MAX_LEN, EMAIL_MAX_LEN } from "../../../utils/personFieldValidation.js";
// export const EMAIL_MAX_LEN = 120;
export const BIO_MAX_LEN = 150;
export const DEFAULT_DIAL = "+91";

export function getSpecializationOptionId(option) {
  return String(option?.id || option?._id || "");
}

export const ALL_COUNTRIES = Country.sortByIsoCode([...Country.getAllCountries()]);

export const DEFAULT_ISO = "IN";
const DEFAULT_COUNTRY_META = Country.getCountryByCode(DEFAULT_ISO);
export const DEFAULT_COUNTRY_NAME = DEFAULT_COUNTRY_META?.name ?? "India";

export const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export function dialCodeFromPhonecode(phonecode) {
  const raw = String(phonecode ?? "").trim();
  if (!raw) return "";
  return raw.startsWith("+") ? raw : `+${raw}`;
}

function dialNormalize(s) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "");
}

export function findIsoForDial(dial) {
  const want = dialNormalize(dial);
  if (!want) return "";
  const wantNoPlus = want.replace(/^\+/, "");
  const hit = ALL_COUNTRIES.find((c) => {
    const d = dialNormalize(dialCodeFromPhonecode(c.phonecode));
    const dNo = d.replace(/^\+/, "");
    return d === want || dNo === wantNoPlus;
  });
  return hit?.isoCode ?? "";
}

function findIsoForCountryName(name) {
  const n = String(name ?? "").trim().toLowerCase();
  if (!n) return "";
  let hit = ALL_COUNTRIES.find((c) => c.name.toLowerCase() === n);
  if (hit) return hit.isoCode;
  const aliases = { usa: "US", uk: "GB", uae: "AE", india: "IN" };
  if (aliases[n]) return aliases[n];
  hit = ALL_COUNTRIES.find(
    (c) => c.name.toLowerCase().startsWith(n) || n.startsWith(c.name.toLowerCase())
  );
  return hit?.isoCode ?? "";
}

export function findStateCodeForName(countryIso, stateName) {
  if (!countryIso || !String(stateName ?? "").trim()) return "";
  const n = String(stateName).trim().toLowerCase();
  const list = State.getStatesOfCountry(countryIso) || [];
  const hit = list.find((s) => s.name.toLowerCase() === n);
  return hit?.isoCode ?? "";
}

export function getLocationOptions(countryIso, stateCode) {
  const iso = countryIso || "";
  if (!iso) return { states: [], cities: [], citiesFromCountry: false };
  const states = State.getStatesOfCountry(iso) || [];
  if (states.length === 0) {
    const cities = City.getCitiesOfCountry(iso) || [];
    return { states: [], cities, citiesFromCountry: true };
  }
  const cities = stateCode ? City.getCitiesOfState(iso, stateCode) || [] : [];
  return { states, cities, citiesFromCountry: false };
}

export function emptyCoachForm() {
  return {
    name: "",
    email: "",
    password: "",
    phoneCountryIso: DEFAULT_ISO,
    phoneCountryCode: DEFAULT_DIAL,
    phone: "",
    bio: "",
    specializationId: "",
    countryIso: DEFAULT_ISO,
    country: DEFAULT_COUNTRY_NAME,
    stateCode: "",
    state: "",
    city: "",
    status: "active",
    roleId: "",
    permissionOverrides: null,
  };
}

export function coachToForm(coach) {
  if (!coach) return emptyCoachForm();

  let countryNm = coach.country != null ? String(coach.country).trim() : "";
  const stateNm = coach.state != null ? String(coach.state) : "";
  const cityNm = coach.city != null ? String(coach.city) : "";
  let countryIso = findIsoForCountryName(countryNm);
  if (!countryNm) {
    countryIso = DEFAULT_ISO;
    countryNm = DEFAULT_COUNTRY_NAME;
  }
  const stateCode = countryIso ? findStateCodeForName(countryIso, stateNm) : "";
  const phoneCc = coach.phoneCountryCode != null ? String(coach.phoneCountryCode).trim() : DEFAULT_DIAL;
  const phoneCountryIso = findIsoForDial(phoneCc) || DEFAULT_ISO;

  return {
    name: sanitizePersonName(coach.name != null ? String(coach.name) : ""),
    email: coach.email != null ? String(coach.email) : "",
    password: "",
    phoneCountryIso,
    phoneCountryCode: phoneCc,
    phone: coach.phone != null ? String(coach.phone) : "",
    bio: coach.bio != null ? String(coach.bio) : "",
    specializationId: coach.specializationId != null ? String(coach.specializationId) : "",
    countryIso,
    country: countryNm,
    stateCode,
    state: stateNm,
    city: cityNm,
    status: coach.status === "inactive" ? "inactive" : "active",
    roleId: coach.roleId != null ? String(coach.roleId) : "",
    permissionOverrides:
      coach.permissionOverrides && typeof coach.permissionOverrides === "object"
        ? coach.permissionOverrides
        : null,
  };
}

export function sanitizeBio(raw, maxLen = BIO_MAX_LEN) {
  return String(raw ?? "").slice(0, maxLen);
}

export function validateBio(bio, { maxLen = BIO_MAX_LEN } = {}) {
  const value = String(bio ?? "");
  if (value.length > maxLen) return `Bio must be at most ${maxLen} characters.`;
  return "";
}

export function validateCoachPassword(password, { required = false, label = "Password" } = {}) {
  const value = String(password ?? "");
  if (!value.trim()) {
    return required ? `${label} is required (${PROFILE_PASSWORD_MIN_LEN}–${PROFILE_PASSWORD_MAX_LEN} characters).` : "";
  }
  if (value.length < PROFILE_PASSWORD_MIN_LEN) {
    return `${label} must be at least ${PROFILE_PASSWORD_MIN_LEN} characters.`;
  }
  if (value.length > PROFILE_PASSWORD_MAX_LEN) {
    return `${label} cannot exceed ${PROFILE_PASSWORD_MAX_LEN} characters.`;
  }
  return "";
}

export function validateCoachRegisterFields(form) {
  const loc = getLocationOptions(form.countryIso, form.stateCode);
  let stateErr = "";
  if (!loc.citiesFromCountry && !String(form.state ?? "").trim()) {
    const states = State.getStatesOfCountry(form.countryIso) || [];
    if (states.length > 0) stateErr = "State / region is required.";
  }

  return {
    name: validatePersonName(form.name, { label: "Full name" }),
    email: validateEmail(form.email, { label: "Email address" }),
    phone: validatePhoneDigits(form.phone),
    password: validateRegistrationPassword(form.password),
    confirmPassword: validateRegistrationConfirmPassword(form.confirmPassword, form.password),
    specializationId: !String(form.specializationId ?? "").trim() ? "Specialization is required." : "",
    bio: validateBio(form.bio),
    country: !String(form.country ?? "").trim() ? "Country is required." : "",
    state: stateErr,
    city: !String(form.city ?? "").trim() ? "City is required." : "",
  };
}

export function firstCoachFormError(errors) {
  return Object.values(errors).find(Boolean) || "";
}

export function validateCoachRegisterForm(form) {
  return firstCoachFormError(validateCoachRegisterFields(form));
}

export function validateCoachForm(form, { requirePassword = false } = {}) {
  const nameErr = validatePersonName(form.name, { label: "Name" });
  if (nameErr) return nameErr;

  const emailErr = validateEmail(form.email);
  if (emailErr) return emailErr;

  const phoneErr = validatePhoneDigits(form.phone);
  const cc = String(form.phoneCountryCode ?? "").trim();

  const passwordErr = validateCoachPassword(form.password, { required: requirePassword });
  if (passwordErr) return passwordErr;
  if (phoneErr) return phoneErr;
  if (!cc) return "Phone country code is required.";
  if (!String(form.country ?? "").trim()) return "Country is required.";
  const loc = getLocationOptions(form.countryIso, form.stateCode);
  if (!loc.citiesFromCountry && !String(form.state ?? "").trim()) {
    const states = State.getStatesOfCountry(form.countryIso) || [];
    if (states.length > 0) return "State / region is required.";
  }
  if (!String(form.city ?? "").trim()) return "City is required.";
  if (!String(form.specializationId ?? "").trim()) return "Specialization is required.";
  const bioErr = validateBio(form.bio);
  if (bioErr) return bioErr;
  if (form.status && !["active", "inactive"].includes(form.status)) {
    return "Status must be active or inactive.";
  }
  return "";
}


export function formatPhone(row) {
  return [row?.phoneCountryCode, row?.phone].filter(Boolean).join(" ") || "—";
}
