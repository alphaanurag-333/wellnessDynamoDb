import coachApi, { normalizeApiError } from "./coachApi.js";

export async function coachGetProgramForClient(userId) {
  try {
    const { data: body } = await coachApi.get(
      `/coach/programs/clients/${encodeURIComponent(userId)}`
    );
    return body;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachListProgramCatalog() {
  try {
    const { data: body } = await coachApi.get("/coach/programs/catalog");
    return body.catalogPrograms ?? body.programs ?? [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachAssignProgram(payload) {
  try {
    const { data: body } = await coachApi.post("/coach/programs", payload);
    return body.program;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachUpdateProgramAssignment(id, payload) {
  try {
    const { data: body } = await coachApi.patch(
      `/coach/programs/${encodeURIComponent(id)}`,
      payload
    );
    return body.program;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachEnableProgramAssignment(id) {
  try {
    const { data: body } = await coachApi.post(
      `/coach/programs/${encodeURIComponent(id)}/enable`
    );
    return body.program;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachDisableProgramAssignment(id) {
  try {
    const { data: body } = await coachApi.post(
      `/coach/programs/${encodeURIComponent(id)}/disable`
    );
    return body.program;
  } catch (error) {
    normalizeApiError(error);
  }
}
