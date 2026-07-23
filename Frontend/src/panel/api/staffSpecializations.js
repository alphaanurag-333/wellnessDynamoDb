import staffApi, { normalizeApiError } from "./staffApi.js";

/** Public, read-only — reused as-is by the Panel's "New Wellness Coach" form (`specializationId`). */
export async function fetchActiveSpecializations() {
  try {
    const { data } = await staffApi.get("/coach/specializations");
    return data?.specializations || [];
  } catch (error) {
    normalizeApiError(error);
  }
}
