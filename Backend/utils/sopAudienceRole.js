const AppError = require("./AppError");
const { normalizeRoleKey, ROLE_KEY_TO_UI } = require("../config/accountRoles");
const { ROLE_KEY_META, UI_TO_ACCOUNT_ROLE } = require("../config/consolePermissionCatalog");
const { getRoleById, getRoleBySlug, listRoles } = require("../models/roleModel");

const AUDIENCE_ALL = "all";
const CONSOLE_ROLE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isConsoleRoleId(value) {
  return CONSOLE_ROLE_ID_RE.test(String(value || "").trim());
}

function isConsoleRole(role) {
  return Boolean(role) && String(role.scope || "").toUpperCase() === "CONSOLE";
}

function normalizeAudienceRoleInput(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.toLowerCase() === AUDIENCE_ALL) return AUDIENCE_ALL;
  if (isConsoleRoleId(raw)) return raw.toLowerCase();
  return raw.toLowerCase();
}

async function getConsoleRoleForAccountRoleKey(accountRoleKey) {
  const key = normalizeRoleKey(accountRoleKey);
  if (!key) return null;
  const uiKey = ROLE_KEY_TO_UI[key];
  const slug = uiKey ? ROLE_KEY_META[uiKey]?.slug : null;
  if (!slug) return null;
  return getRoleBySlug(slug, { scope: "CONSOLE" });
}

async function resolveAudienceRoleForStorage(raw, { fallback = AUDIENCE_ALL } = {}) {
  const normalized = normalizeAudienceRoleInput(raw);
  if (!normalized) return fallback;
  if (normalized === AUDIENCE_ALL) return AUDIENCE_ALL;

  if (isConsoleRoleId(normalized)) {
    const role = await getRoleById(normalized);
    if (!role || !isConsoleRole(role) || String(role.status || "active").toLowerCase() === "inactive") {
      throw new AppError("invalid audience role", 400);
    }
    return role.id;
  }

  const accountKey = normalizeRoleKey(normalized);
  if (accountKey) {
    const role = await getConsoleRoleForAccountRoleKey(accountKey);
    if (role?.id) return role.id;
    return accountKey;
  }

  throw new AppError("invalid audience role", 400);
}

function accountRoleKeyFromConsoleRole(role) {
  if (!role) return null;
  const uiKey = String(role.roleKey || "").toLowerCase();
  return UI_TO_ACCOUNT_ROLE[uiKey] || normalizeRoleKey(uiKey);
}

async function loadConsoleRolesIndex() {
  const { roles } = await listRoles({
    scope: "CONSOLE",
    status: "active",
    page: 1,
    limit: 200,
  });

  const byId = {};
  const byAccountRoleKey = {};

  for (const role of roles || []) {
    byId[role.id] = role;
    const accountKey = accountRoleKeyFromConsoleRole(role);
    if (accountKey) byAccountRoleKey[accountKey] = role.id;
    const uiKey = String(role.roleKey || "").toLowerCase();
    if (uiKey) byAccountRoleKey[uiKey] = role.id;
  }

  return { roles: roles || [], byId, byAccountRoleKey };
}

function sopMatchesAudienceRole(sop, viewer, index = null) {
  const audience = normalizeAudienceRoleInput(sop?.audienceRole) || AUDIENCE_ALL;
  if (audience === AUDIENCE_ALL) return true;

  const roleId = String(viewer?.roleId || "").trim().toLowerCase();
  const roleKey = normalizeRoleKey(viewer?.roleKey);

  if (roleId && audience === roleId) return true;
  if (roleKey && audience === roleKey) return true;

  if (!index) return false;

  const { byId, byAccountRoleKey } = index;

  if (isConsoleRoleId(audience)) {
    const target = byId[audience];
    const targetAccountKey = accountRoleKeyFromConsoleRole(target);
    if (roleKey && targetAccountKey && roleKey === targetAccountKey) return true;
    if (roleKey && byAccountRoleKey[roleKey] === audience) return true;
    return false;
  }

  if (roleKey && roleKey === audience) return true;
  if (roleId && byAccountRoleKey[audience] === roleId) return true;
  return false;
}

module.exports = {
  AUDIENCE_ALL,
  isConsoleRoleId,
  normalizeAudienceRoleInput,
  resolveAudienceRoleForStorage,
  loadConsoleRolesIndex,
  sopMatchesAudienceRole,
  accountRoleKeyFromConsoleRole,
  getConsoleRoleForAccountRoleKey,
};
