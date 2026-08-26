import api, { normalizeApiError } from "../api.js";

const NUMBER_MAX = 20;
const MESSAGE_MAX = 500;
const DEFAULT_MESSAGE =
  "Hi, I need help with the IR Wellness app.";

function appConfigBase() {
  return "/admin/app-config";
}

function toEnabled(value) {
  return value === true || String(value || "").toLowerCase() === "true";
}

export function mapWhatsappSupport(config = {}) {
  return {
    enabled: toEnabled(config.support_whatsapp_enabled),
    number: String(config.support_whatsapp_number ?? "").trim(),
    message: String(config.support_whatsapp_message ?? "").trim() || DEFAULT_MESSAGE,
  };
}

export async function getWhatsappSupport() {
  try {
    const { data } = await api.get(appConfigBase());
    return mapWhatsappSupport(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveWhatsappSupport({ enabled, number, message }) {
  try {
    const { data } = await api.patch(appConfigBase(), {
      support_whatsapp_enabled: Boolean(enabled),
      support_whatsapp_number: String(number ?? "").trim().slice(0, NUMBER_MAX),
      support_whatsapp_message: String(message ?? "").trim().slice(0, MESSAGE_MAX),
    });
    return mapWhatsappSupport(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}

export { NUMBER_MAX, MESSAGE_MAX, DEFAULT_MESSAGE };
