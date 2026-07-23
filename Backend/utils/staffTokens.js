/**
 * Cutover-aware JWT issuance for the legacy per-account-type auth controllers
 * (`Backend/controllers/adminController/authController.js`,
 * `Backend/controllers/wellnessCoachController/authController.js`,
 * `Backend/controllers/assistantWellnessCoachController/authController.js`).
 *
 * Frontend keeps calling the same old login/OTP/refresh URLs through M4-M6
 * (the unified panel doesn't exist until M7/M8) but `protectStaff` only
 * accepts `{ role: "staff", accountType }` tokens (see
 * `Backend/middleware/auth.js`). Once an account type's `STAFF_CUTOVER_*`
 * flag flips, its legacy endpoints must start minting that same shape so
 * existing frontend flows keep working without any frontend change — this
 * is what actually makes each milestone's middleware cutover safe.
 *
 * Before cutover, legacy shape (`{ sub, role: "<legacy role>" }`) is
 * unchanged. Refresh is intentionally forgiving in the other direction too:
 * a still-valid refresh token minted in the legacy shape (before cutover)
 * is re-issued in the *new* shape on its next refresh once cutover is on,
 * so an already-logged-in user upgrades silently on token refresh instead
 * of being hard-logged-out (belt-and-suspenders alongside the plan's
 * documented "force re-login" fallback for anyone who doesn't refresh
 * first and hits a 403 on their still-old-shaped access token).
 */
const config = require("../config");
const { createTokenPair } = require("./jwt");

/** `accountType` -> legacy JWT `role` claim (unchanged since before this migration). */
const LEGACY_ROLE_BY_ACCOUNT_TYPE = {
  admin: "admin",
  wellness_coach: "wellness_coach",
  assistant_wellness_coach: "assistant_wellness_coach",
};

function isCutOver(accountType) {
  return Boolean(config.staffCutover?.[accountType]);
}

/** Build the token-pair payload for `accountType`/`id`, new or legacy shape depending on the cutover flag. */
function buildTokenPayload(accountType, id) {
  if (isCutOver(accountType)) {
    return { sub: id, role: "staff", accountType };
  }
  return { sub: id, role: LEGACY_ROLE_BY_ACCOUNT_TYPE[accountType] };
}

/** Issue an access/refresh token pair for a legacy auth controller, cutover-shape-aware. */
function createAccountTokenPair(accountType, id) {
  return createTokenPair(buildTokenPayload(accountType, id));
}

/**
 * A refresh-token payload is acceptable for `accountType` if it matches
 * either the legacy role claim or (post-cutover) the unified staff shape —
 * covers a refresh token minted just before cutover being redeemed just after.
 */
function payloadMatchesAccountType(payload, accountType) {
  if (!payload) return false;
  if (payload.role === LEGACY_ROLE_BY_ACCOUNT_TYPE[accountType]) return true;
  if (payload.role === "staff" && payload.accountType === accountType) return true;
  return false;
}

module.exports = {
  LEGACY_ROLE_BY_ACCOUNT_TYPE,
  isCutOver,
  createAccountTokenPair,
  payloadMatchesAccountType,
};
