const { generateSecret, generateURI, verifySync } = require("otplib");
const config = require("../config");

/**
 * Generate a new base32 TOTP secret for Google Authenticator.
 * @returns {string}
 */
function generateTotpSecret() {
  return generateSecret();
}

/**
 * Build an otpauth:// URI for authenticator apps / QR codes.
 * @param {{ secret: string, email: string, issuer?: string }} opts
 * @returns {string}
 */
function buildOtpauthUrl({ secret, email, issuer }) {
  const label = String(email || "account").trim() || "account";
  const iss = String(issuer || config.totpIssuer || "Wellness Admin").trim() || "Wellness Admin";
  return generateURI({
    issuer: iss,
    label,
    secret: String(secret || "").trim(),
  });
}

/**
 * Verify a 6-digit TOTP code against a stored secret (±1 step window).
 * @param {string} secret
 * @param {string|number} token
 * @returns {boolean}
 */
function verifyTotp(secret, token) {
  const code = String(token || "").replace(/\s+/g, "").trim();
  if (!secret || !/^\d{6}$/.test(code)) return false;
  try {
    const result = verifySync({
      secret: String(secret).trim(),
      token: code,
      // ±30s → one adjacent time step
      epochTolerance: 30,
    });
    return Boolean(result?.valid);
  } catch {
    return false;
  }
}

module.exports = {
  generateTotpSecret,
  buildOtpauthUrl,
  verifyTotp,
};
