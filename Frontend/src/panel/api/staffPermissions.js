import staffApi, { authHeader, normalizeApiError } from "./staffApi.js";

/**
 * Fetch the unified permission catalog (`Backend/config/staffPermissionCatalog.js`)
 * that drives the Role editor's checkbox tree. Pass `accountType` to filter
 * the module list to what's assignable to that account type; omit for the
 * full catalog (used e.g. when a role targets more than one account type).
 */
export async function fetchStaffPermissionCatalog(token, accountType) {
  try {
    const { data } = await staffApi.get("/staff/permissions", {
      headers: authHeader(token),
      params: accountType ? { accountType } : undefined,
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}
