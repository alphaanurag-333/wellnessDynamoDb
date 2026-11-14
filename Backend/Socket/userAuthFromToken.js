const AppError = require("../utils/AppError");
const { verifyAccessToken } = require("../utils/jwt");
const { getUserById } = require("../models/userModel");

function assertActiveAccount(doc) {
  if (doc.status === "deleted") {
    throw new AppError("Account has been deleted", 401);
  }
  if (doc.status === "blocked") {
    throw new AppError("Account is blocked", 403);
  }
  if (doc.status === "inactive") {
    throw new AppError("Account is inactive", 403);
  }
}

/**
 * Build req-like mobile user auth from a JWT (for WebSocket handshake).
 * Mirrors `protectUser` sessionVersion checks.
 * @param {string} token
 * @param {object} [preVerifiedPayload] — optional payload from a prior verifyAccessToken
 * @returns {Promise<{ req: { auth: object, user: object } }>}
 */
async function resolveUserAuthFromToken(token, preVerifiedPayload) {
  const trimmed = String(token || "").trim();
  if (!trimmed) throw new AppError("Authentication required", 401);

  let payload = preVerifiedPayload;
  if (!payload) {
    try {
      payload = verifyAccessToken(trimmed);
      if (payload?.purpose === "mfa") {
        throw new AppError("Invalid or expired token", 401);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("Invalid or expired token", 401);
    }
  }

  if (String(payload.role || "").trim() !== "user") {
    throw new AppError("Forbidden", 403);
  }

  const subject = String(payload.sub ?? payload.id ?? payload._id ?? "").trim();
  if (!subject) throw new AppError("Invalid token payload", 401);

  const account = await getUserById(subject);
  if (!account) throw new AppError("Account not found", 401);
  assertActiveAccount(account);

  const tokenSv = payload.sv == null ? 0 : Number(payload.sv);
  const userSv = Number(account.sessionVersion || 0);
  if (tokenSv !== userSv) {
    const err = new AppError("Logged in on another device. Please login again.", 401);
    err.code = "SESSION_REPLACED";
    throw err;
  }

  const req = {
    user: account,
    auth: { role: "user", sub: subject, sv: userSv },
  };

  return { req };
}

module.exports = { resolveUserAuthFromToken };
