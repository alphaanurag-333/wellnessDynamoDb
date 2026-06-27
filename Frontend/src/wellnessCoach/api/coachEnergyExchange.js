import coachApi, { normalizeApiError } from "./coachApi.js";

export async function coachListEnergyExchangePrograms(userId) {
  try {
    const { data: body } = await coachApi.get(
      `/coach/energy-exchange/programs?userId=${encodeURIComponent(userId)}`
    );
    return body.programs ?? [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachCreateEnergyExchangeProgram(payload) {
  try {
    const { data: body } = await coachApi.post("/coach/energy-exchange/programs", payload);
    return body.program;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachUpdateEnergyExchangeProgram(id, payload) {
  try {
    const { data: body } = await coachApi.patch(
      `/coach/energy-exchange/programs/${encodeURIComponent(id)}`,
      payload
    );
    return body.program;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachEnableEnergyExchangeProgram(id) {
  try {
    const { data: body } = await coachApi.post(
      `/coach/energy-exchange/programs/${encodeURIComponent(id)}/enable`
    );
    return body.program;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachDisableEnergyExchangeProgram(id) {
  try {
    const { data: body } = await coachApi.post(
      `/coach/energy-exchange/programs/${encodeURIComponent(id)}/disable`
    );
    return body.program;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachPreviewEnergyExchangeProgram(id) {
  try {
    const { data: body } = await coachApi.get(
      `/coach/energy-exchange/programs/${encodeURIComponent(id)}/preview`
    );
    return body;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachGetEnergyExchangeForUser(userId) {
  try {
    const { data: body } = await coachApi.get(
      `/coach/energy-exchange/heal-users/${encodeURIComponent(userId)}`
    );
    return body;
  } catch (error) {
    normalizeApiError(error);
  }
}
