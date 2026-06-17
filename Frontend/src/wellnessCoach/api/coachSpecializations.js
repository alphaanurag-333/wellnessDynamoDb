import coachApi, { normalizeApiError } from "./coachApi.js";

export async function coachListSpecializations() {
  try {
    const { data } = await coachApi.get("/coach/specializations");
    return {
      specializations: Array.isArray(data.specializations) ? data.specializations : [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
