import api, { authHeader, normalizeApiError } from "../../api.js";

export async function adminGetConfigDropdown(token, idOrSlug) {
  try {
    const { data } = await api.get(`/admin/config-dropdowns/${encodeURIComponent(idOrSlug)}`, {
      headers: authHeader(token),
    });
    return data.list || null;
  } catch (error) {
    normalizeApiError(error);
  }
}
