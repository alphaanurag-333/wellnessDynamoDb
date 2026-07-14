/** Raw admin object stored after login (includes RBAC fields returned by the backend). */
export function selectAdmin(state) {
  return state.auth?.admin ?? null;
}

export function selectIsSuperAdmin(state) {
  return Boolean(selectAdmin(state)?.isSuperAdmin);
}

export function selectPermissions(state) {
  const permissions = selectAdmin(state)?.permissions;
  return Array.isArray(permissions) ? permissions : [];
}

/** Memo-friendly Set for O(1) `.has(slug)` lookups in useHasPermission. */
export function selectAdminPermissionSet(state) {
  return new Set(selectPermissions(state));
}
