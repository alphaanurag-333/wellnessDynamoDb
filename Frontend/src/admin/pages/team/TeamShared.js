import { validatePhoneDigits } from "../../../utils/personFieldValidation.js";

export const NAME_MAX_LEN = 60;
export const LIST_SEARCH_MAX_LEN = 50;
export const LIST_LIMIT = 10;
export const LIST_LIMIT_OPTIONS = [10, 25, 50];

export function emptyForm() {
  return {
    name: "",
    email: "",
    password: "",
    phone: "",
    roleId: "",
    status: "active",
    parentAccountId: "",
    specializationId: "",
    referralCode: "",
    approvalStatus: "approved",
  };
}

export function getTeamMemberId(row) {
  return row?.id || row?._id || "";
}

export function formatAccountType(type) {
  if (type === "wellness_coach") return "Coach";
  if (type === "assistant_wellness_coach") return "Assistant";
  return "Admin";
}

export function validateTeamForm(form, { isEdit = false } = {}) {
  const name = String(form.name ?? "").trim();
  const email = String(form.email ?? "").trim();
  const password = String(form.password ?? "");

  if (!name) return "Name is required.";
  if (name.length > NAME_MAX_LEN) return `Name cannot exceed ${NAME_MAX_LEN} characters.`;
  if (!isEdit) {
    if (!email) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
    if (!password) return "Password is required.";
  }
  if (password && (password.length < 8 || password.length > 15)) {
    return "Password must be 8-15 characters.";
  }
  const phoneErr = validatePhoneDigits(form.phone);
  if (phoneErr) return phoneErr;
  if (!form.roleId) return "Please select a role.";
  return "";
}
