import api, { normalizeApiError } from "../api.js";
import { CONTACT_DETAILS } from "../data/contactConfigData.js";

function appConfigBase() {
  return "/admin/app-config";
}

function isPhoneLabel(label) {
  return /phone|mobile|whatsapp|tel/i.test(String(label || ""));
}

function isEmailLabel(label) {
  return /email|mail/i.test(String(label || ""));
}

export function mapWebContactDetails(config = {}) {
  const rows = Array.isArray(config.web_contact_details) ? config.web_contact_details : [];
  const mapped = rows
    .map((row) => ({
      id: String(row.id || "").trim(),
      label: String(row.label || "").trim(),
      value: String(row.value || "").trim(),
      live: row.live !== false,
    }))
    .filter((row) => row.id && row.label && row.value);
  if (mapped.length) return mapped;

  const seeded = [];
  const phone = String(config.app_mobile || "").trim();
  const email = String(config.app_email || "").trim();
  if (phone) seeded.push({ id: "ct-phone", label: "Phone", value: phone, live: true });
  if (email) seeded.push({ id: "ct-support", label: "Support email", value: email, live: true });
  return seeded.length ? seeded : CONTACT_DETAILS.map((row) => ({ ...row }));
}

export async function getWebContactDetails() {
  try {
    const { data } = await api.get(appConfigBase());
    return mapWebContactDetails(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveWebContactDetails(details) {
  const payload = (Array.isArray(details) ? details : [])
    .map((row) => ({
      id: String(row.id || "").trim(),
      label: String(row.label || "").trim(),
      value: String(row.value || "").trim(),
      live: row.live !== false,
    }))
    .filter((row) => row.id && row.label && row.value);

  const live = payload.filter((row) => row.live);
  const phone = live.find((row) => isPhoneLabel(row.label));
  const email = live.find((row) => isEmailLabel(row.label));

  try {
    const { data } = await api.patch(appConfigBase(), {
      web_contact_details: payload,
      ...(phone ? { app_mobile: phone.value } : {}),
      ...(email ? { app_email: email.value } : {}),
    });
    return mapWebContactDetails(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}
