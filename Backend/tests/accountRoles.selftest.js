const {
  normalizeRoleKey,
  DEFAULT_ROLE_PRIORITY,
  UI_ROLE_TO_KEY,
  ROLE_KEY_TO_UI,
} = require("../config/accountRoles");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(normalizeRoleKey("Admin") === "admin", "normalizeRoleKey admin");
assert(normalizeRoleKey("wellness_coach") === "wellness_coach", "normalizeRoleKey coach");
assert(normalizeRoleKey("nope") === null, "normalizeRoleKey invalid");
assert(UI_ROLE_TO_KEY.wc === "wellness_coach", "ui map wc");
assert(ROLE_KEY_TO_UI.assistant_wellness_coach === "awc", "ui map awc");
assert(DEFAULT_ROLE_PRIORITY[0] === "admin", "priority admin first");

console.log("accountRoles.selftest.ok");
