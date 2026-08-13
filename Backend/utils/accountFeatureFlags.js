/**
 * Optional helper: when ACCOUNT_LEGACY_SHIMS=false, callers can skip mounting
 * legacy staff routers. Currently routes/index.js still mounts legacy prefixes
 * for backward compatibility; flip this helper into routes/index.js when ready.
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
