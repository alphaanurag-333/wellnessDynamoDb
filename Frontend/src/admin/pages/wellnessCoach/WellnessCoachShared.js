import { City, Country, State } from "country-state-city";

export const LIST_LIMIT = 10;
export const LIST_SEARCH_MAX_LEN = 120;
export const NAME_MAX_LEN = 100;
export const EMAIL_MAX_LEN = 120;
export const BIO_MAX_LEN = 2000;
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
    name: coach.name != null ? String(coach.name) : "",
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
  };
}

export function validateCoachPassword(password, { required = false } = {}) {
  const value = String(password ?? "").trim();
  if (!value) {
    return required ? "Password is required (minimum 8 characters)." : "";
  }
  if (value.length < 8) return "Password must be at least 8 characters.";
  return "";
}

export function validateCoachForm(form, { requirePassword = false } = {}) {
  const name = String(form.name ?? "").trim();
  const email = String(form.email ?? "").trim();
  const phone = String(form.phone ?? "").trim();
  const cc = String(form.phoneCountryCode ?? "").trim();

  if (!name || name.length < 2) return "Name is required (at least 2 characters).";
  if (!email) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  const passwordErr = validateCoachPassword(form.password, { required: requirePassword });
  if (passwordErr) return passwordErr;
  if (!phone) return "Mobile number is required.";
  if (!/^\d+$/.test(phone)) return "Mobile number should contain digits only.";
  if (phone.length !== 10) return "Mobile number must be exactly 10 digits.";
  if (!cc) return "Phone country code is required.";
  if (!String(form.country ?? "").trim()) return "Country is required.";
  const loc = getLocationOptions(form.countryIso, form.stateCode);
  if (!loc.citiesFromCountry && !String(form.state ?? "").trim()) {
    const states = State.getStatesOfCountry(form.countryIso) || [];
    if (states.length > 0) return "State / region is required.";
  }
  if (!String(form.city ?? "").trim()) return "City is required.";
  if (!String(form.specializationId ?? "").trim()) return "Specialization is required.";
  if (form.status && !["active", "inactive"].includes(form.status)) {
    return "Status must be active or inactive.";
  }
  return "";
}

export function formatDate(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

export function formatPhone(row) {
  return [row?.phoneCountryCode, row?.phone].filter(Boolean).join(" ") || "—";
}
