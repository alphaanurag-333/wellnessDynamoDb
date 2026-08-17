import api, { normalizeApiError } from "../api.js";

function mapProgram(row, index) {
  return {
    id: String(row?.id || `program-${index + 1}`),
    name: String(row?.name || "").trim(),
    amount: Number(row?.amount) || 0,
    discountPercent: Number(row?.discountPercent) || 0,
    validityHours: Number(row?.validityHours) || 0,
  };
}

export async function getAppProgramPricing() {
  try {
    const { data } = await api.get("/account/app-config");
    const rows = data?.data?.app_program_pricing;
    return Array.isArray(rows) ? rows.map(mapProgram).filter((row) => row.name) : null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveAppProgramPricing(rows) {
  try {
    const { data } = await api.patch("/account/app-config", {
      app_program_pricing: rows.map(mapProgram),
    });
    const saved = data?.data?.app_program_pricing;
    return Array.isArray(saved) ? saved.map(mapProgram).filter((row) => row.name) : [];
  } catch (error) {
    normalizeApiError(error);
  }
}
