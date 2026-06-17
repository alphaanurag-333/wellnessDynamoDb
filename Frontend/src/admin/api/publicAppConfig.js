import api, { normalizeApiError } from "../../api.js";

/** No auth — same payload shape as backend `GET /api/public/app-config`. */
export async function getPublicAppConfig() {
  try {
    const { data: body } = await api.get("/public/app-config");
    return body;
  } catch (error) {
    normalizeApiError(error);
  }
}
