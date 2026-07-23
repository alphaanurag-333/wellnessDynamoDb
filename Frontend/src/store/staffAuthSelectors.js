/** Raw staff account object stored after login via the unified `/panel` login (`/api/staff/auth/*`). */
export function selectStaffAccount(state) {
  return state.auth?.staffAccount ?? null;
}

export function selectStaffToken(state) {
  return state.auth?.staffToken ?? null;
}

export function selectIsStaffSuperAdmin(state) {
  return Boolean(selectStaffAccount(state)?.isSuperAdmin);
}

export function selectStaffAccountType(state) {
  return selectStaffAccount(state)?.accountType ?? null;
}

export function selectStaffPermissions(state) {
  const permissions = selectStaffAccount(state)?.permissions;
  return Array.isArray(permissions) ? permissions : [];
}
