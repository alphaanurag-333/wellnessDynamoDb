/**
 * Canonical staff Account role keys (JWT `role` / membership.roleKey).
 * Users (mobile clients) are NOT Account role keys.
 */

const ACCOUNT_ROLE_KEYS = Object.freeze([
  "admin",
  "wellness_coach",
  "assistant_wellness_coach",
  "trainee",
  "support",
]);

const ACCOUNT_ROLE_KEY_SET = new Set(ACCOUNT_ROLE_KEYS);

/** Login / switch preference order when defaultRoleKey is missing. */
const DEFAULT_ROLE_PRIORITY = Object.freeze([
  "admin",
  "wellness_coach",
  "assistant_wellness_coach",
  "trainee",
  "support",
]);

/** Role.scope values ↔ Account roleKey */
const ROLE_KEY_TO_SCOPE = Object.freeze({
  admin: "ADMIN",
  wellness_coach: "COACH",
  assistant_wellness_coach: "ASSISTANT",
  trainee: "TRAINEE",
  support: "SUPPORT",
});

const SCOPE_TO_ROLE_KEY = Object.freeze(
  Object.fromEntries(Object.entries(ROLE_KEY_TO_SCOPE).map(([k, v]) => [v, k]))
);

/** updatedadmin View-as ids ↔ backend roleKeys */
const UI_ROLE_TO_KEY = Object.freeze({
  admin: "admin",
  wc: "wellness_coach",
  awc: "assistant_wellness_coach",
  trainee: "trainee",
  support: "support",
});

const ROLE_KEY_TO_UI = Object.freeze(
  Object.fromEntries(Object.entries(UI_ROLE_TO_KEY).map(([ui, key]) => [key, ui]))
);

const ASSIGNEE_ROLE_KEYS = Object.freeze(["wellness_coach", "assistant_wellness_coach"]);

function normalizeRoleKey(value) {
  const next = String(value || "")
    .toLowerCase()
    .trim();
  return ACCOUNT_ROLE_KEY_SET.has(next) ? next : null;
}

function scopeForRoleKey(roleKey) {
  const key = normalizeRoleKey(roleKey);
  return key ? ROLE_KEY_TO_SCOPE[key] : null;
}

function roleKeyForScope(scope) {
  const next = String(scope || "")
    .toUpperCase()
    .trim();
  return SCOPE_TO_ROLE_KEY[next] || null;
}

module.exports = {
  ACCOUNT_ROLE_KEYS,
  ACCOUNT_ROLE_KEY_SET,
  DEFAULT_ROLE_PRIORITY,
  ROLE_KEY_TO_SCOPE,
  SCOPE_TO_ROLE_KEY,
  UI_ROLE_TO_KEY,
  ROLE_KEY_TO_UI,
  ASSIGNEE_ROLE_KEYS,
  normalizeRoleKey,
  scopeForRoleKey,
  roleKeyForScope,
};
