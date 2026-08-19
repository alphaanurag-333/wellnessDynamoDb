import { ROLE_KEY_TO_UI } from "../api/accountApi.js";
import { VIEW_AS_ROLES } from "../data/dashboardData.js";
import {
  ALL_CONSOLE_PERMISSIONS,
  baselineDataScopeForRole,
  baselinePermissionsForRole,
  grantsToPermissions,
} from "./permissions.js";

const SYSTEM_UI_IDS = new Set(VIEW_AS_ROLES.map((role) => role.id));

export function accessRoleViewId(role) {
  if (!role) return null;
  if (role.roleKey && ROLE_KEY_TO_UI[role.roleKey]) return ROLE_KEY_TO_UI[role.roleKey];
  return role.roleKey || role.id;
}

export function personaForAccessRole(role) {
  const mapped = role?.roleKey ? ROLE_KEY_TO_UI[role.roleKey] : null;
  if (mapped) return mapped;
  const scope = String(role?.dataScope || "").toLowerCase();
  if (scope === "assigned") return "wc";
  if (scope === "team") return "awc";
  if (scope === "all") return "support";
  return "wc";
}

export function permissionsFromAccessRole(role) {
  if (!role) return [];
  if (role.grants == null) return [...ALL_CONSOLE_PERMISSIONS];
  if (Array.isArray(role.permissions) && role.permissions.length) return role.permissions;
  return grantsToPermissions(role.grants);
}

const CUSTOM_ROLE_COLORS = [
  { color: "#db2777", bg: "#fce7f3" },
  { color: "#ea580c", bg: "#ffedd5" },
  { color: "#0284c7", bg: "#e0f2fe" },
  { color: "#4f46e5", bg: "#e0e7ff" },
  { color: "#0f766e", bg: "#ccfbf1" },
  { color: "#b45309", bg: "#fef3c7" },
];

function colorForCustomRole(id) {
  const seed = String(id || "");
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return CUSTOM_ROLE_COLORS[hash % CUSTOM_ROLE_COLORS.length];
}

export function toViewAsMenuRole(role) {
  const id = accessRoleViewId(role);
  const fallback = VIEW_AS_ROLES.find((entry) => entry.id === id);
  const system = Boolean(role.system || SYSTEM_UI_IDS.has(id));
  const customTint = !system ? colorForCustomRole(id) : null;
  return {
    id,
    dbId: role.id,
    name: role.name || fallback?.name || "Role",
    color: (system ? role.color : null) || fallback?.color || customTint?.color || "#5e6ad2",
    bg: (system ? role.bg : null) || fallback?.bg || customTint?.bg || "#eceefc",
    live: Number(role.memberCount) || 0,
    switchable: fallback ? fallback.switchable !== false : true,
    persona: personaForAccessRole(role),
    dataScope: String(role.dataScope || baselineDataScopeForRole(id) || "assigned").toLowerCase(),
    permissions: permissionsFromAccessRole(role),
    system,
  };
}

export function staticViewAsMenuRoles() {
  return VIEW_AS_ROLES.map((role) => ({
    ...role,
    persona: role.id,
    dataScope: baselineDataScopeForRole(role.id),
    permissions: baselinePermissionsForRole(role.id),
  }));
}
