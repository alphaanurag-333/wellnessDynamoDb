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

export function validateAssistantPassword(password, { required = false } = {}) {
  const value = String(password ?? "").trim();
  if (!value) {
    return required ? "Password is required (minimum 8 characters)." : "";
  }
  if (value.length < 8) return "Password must be at least 8 characters.";
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

export function formatDate(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

export function formatPhone(row) {
  return [row?.phoneCountryCode, row?.phone].filter(Boolean).join(" ") || "—";
}
