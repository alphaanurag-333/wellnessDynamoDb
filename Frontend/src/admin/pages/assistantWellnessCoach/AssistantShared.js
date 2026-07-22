import {
  DEFAULT_DIAL,
  DEFAULT_ISO,
  findIsoForDial,
} from "../wellnessCoach/WellnessCoachShared.js";
import {
  sanitizePersonName,
  validateEmail,
  validatePersonName,
  validatePhoneDigits,
} from "../../../utils/personFieldValidation.js";
import {
  PROFILE_PASSWORD_MAX_LEN,
  PROFILE_PASSWORD_MIN_LEN,
} from "../../../utils/profilePasswordValidation.js";

export { formatDate } from "../../utils/formatDate.js";
export const LIST_LIMIT = 10;
export const DESIGNATION_MAX_LEN = 120;

export const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export function resolveAssistantId(row) {
  if (!row) return "";
  return String(row._id || row.id || "");
}

export function emptyAssistantForm() {
  return {
    name: "",
    email: "",
    password: "",
    phoneCountryIso: DEFAULT_ISO,
    phoneCountryCode: DEFAULT_DIAL,
    phone: "",
    designation: "",
    status: "active",
  };
}

export function assistantToForm(assistant) {
  if (!assistant) return emptyAssistantForm();
  const phoneCc =
    assistant.phoneCountryCode != null ? String(assistant.phoneCountryCode).trim() : DEFAULT_DIAL;
  return {
    name: sanitizePersonName(assistant.name != null ? String(assistant.name) : ""),
    email: assistant.email != null ? String(assistant.email) : "",
    password: "",
    phoneCountryIso: findIsoForDial(phoneCc) || DEFAULT_ISO,
    phoneCountryCode: phoneCc,
    phone: assistant.phone != null ? String(assistant.phone) : "",
    designation: assistant.designation != null ? String(assistant.designation) : "",
    status: assistant.status === "inactive" ? "inactive" : "active",
  };
}

export function validateAssistantPassword(password, { required = false, label = "Password" } = {}) {
  const value = String(password ?? "");
  if (!value.trim()) {
    return required
      ? `${label} is required (${PROFILE_PASSWORD_MIN_LEN}–${PROFILE_PASSWORD_MAX_LEN} characters).`
      : "";
  }
  if (value.length < PROFILE_PASSWORD_MIN_LEN) {
    return `${label} must be at least ${PROFILE_PASSWORD_MIN_LEN} characters.`;
  }
  if (value.length > PROFILE_PASSWORD_MAX_LEN) {
    return `${label} cannot exceed ${PROFILE_PASSWORD_MAX_LEN} characters.`;
  }
  return "";
}

export function validateAssistantForm(form, { requirePassword = false } = {}) {
  const nameErr = validatePersonName(form.name, { label: "Name" });
  if (nameErr) return nameErr;

  const emailErr = validateEmail(form.email);
  if (emailErr) return emailErr;

  const phoneErr = validatePhoneDigits(form.phone);
  const cc = String(form.phoneCountryCode ?? "").trim();

  const passwordErr = validateAssistantPassword(form.password, { required: requirePassword });
  if (passwordErr) return passwordErr;
  if (phoneErr) return phoneErr;
  if (!cc) return "Phone country code is required.";
  if (form.status && !["active", "inactive"].includes(form.status)) {
    return "Status must be active or inactive.";
  }
  return "";
}


export function formatPhone(row) {
  return [row?.phoneCountryCode, row?.phone].filter(Boolean).join(" ") || "—";
}
