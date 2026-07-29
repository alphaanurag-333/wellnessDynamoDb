/** Raw panel user stored after login (admin / coach / assistant). */
export function selectAdmin(state) {
  return state.auth?.admin ?? null;
}

export function selectAccountType(state) {
  return selectAdmin(state)?.accountType || "admin";
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

export function selectIsCoachAccount(state) {
  return selectAccountType(state) === "wellness_coach";
}

export function selectIsAssistantAccount(state) {
  return selectAccountType(state) === "assistant_wellness_coach";
}
