const AppError = require("../utils/AppError");
const { verifyAccessToken } = require("../utils/jwt");
const { resolveStaffAuthFromToken } = require("./staffAuthFromToken");
const { resolveUserAuthFromToken } = require("./userAuthFromToken");

/**
 * Handshake auth: staff Account JWT or mobile user JWT.
 * @param {string} token
 * @returns {Promise<{ kind: "staff"|"user", req: object }>}
 */
async function resolveSocketAuthFromToken(token) {
  const trimmed = String(token || "").trim();
  if (!trimmed) throw new AppError("Authentication required", 401);

  let payload;
  try {
    payload = verifyAccessToken(trimmed);
    if (payload?.purpose === "mfa") {
      throw new AppError("Invalid or expired token", 401);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Invalid or expired token", 401);
  }

  const role = String(payload.role || "")
    .trim()
    .toLowerCase();

  if (role === "user") {
    const { req } = await resolveUserAuthFromToken(trimmed, payload);
    return { kind: "user", req };
  }

  const { req } = await resolveStaffAuthFromToken(trimmed);
  return { kind: "staff", req };
}

module.exports = { resolveSocketAuthFromToken };
