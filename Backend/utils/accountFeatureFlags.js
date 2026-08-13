/**
 * Optional helper: when ACCOUNT_LEGACY_SHIMS=false, callers can skip mounting
 * legacy staff *feature* routers (/admin|/coach|/assistant). Staff auth already
 * lives only under /api/account/auth.
 */
const config = require("../config");

function shouldMountLegacyStaffRoutes() {
  return config.accountLegacyShims !== false;
}

function shouldUseAccountAuth() {
  return Boolean(config.accountAuthEnabled);
}

function shouldDualWriteAccounts() {
  return Boolean(config.accountDualWrite);
}

module.exports = {
  shouldMountLegacyStaffRoutes,
  shouldUseAccountAuth,
  shouldDualWriteAccounts,
};
