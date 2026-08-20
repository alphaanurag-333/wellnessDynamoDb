import api, { normalizeApiError } from "../api.js";

function basePath() {
  return "/account/energy-exchange";
}

export async function listEnergyExchangePrograms(userId) {
  try {
    const { data } = await api.get(`${basePath()}/programs`, {
      params: { userId },
    });
    return Array.isArray(data?.programs) ? data.programs : [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function createEnergyExchangeProgram(payload) {
  try {
    const { data } = await api.post(`${basePath()}/programs`, payload);
    return data?.program || null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function updateEnergyExchangeProgram(programId, payload) {
  try {
    const { data } = await api.patch(
      `${basePath()}/programs/${encodeURIComponent(programId)}`,
      payload,
    );
    return data?.program || null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function enableEnergyExchangeProgram(programId) {
  try {
    const { data } = await api.post(
      `${basePath()}/programs/${encodeURIComponent(programId)}/enable`,
    );
    return data?.program || null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function disableEnergyExchangeProgram(programId) {
  try {
    const { data } = await api.post(
      `${basePath()}/programs/${encodeURIComponent(programId)}/disable`,
    );
    return data?.program || null;
  } catch (error) {
    normalizeApiError(error);
  }
}
