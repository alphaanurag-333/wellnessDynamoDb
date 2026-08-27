const { PutCommand, GetCommand, BatchWriteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { isOtpExpired } = require("../utils/otp");
const { normalizeEmail, buildPhoneKey } = require("./userModel");
const config = require("../config");

const TABLE = "RegistrationOtp";

function emailLookupKey(email) {
  const normalized = normalizeEmail(email);
  return normalized ? `email:${normalized}` : "";
}

function phoneLookupKey(phoneCountryCode, phone) {
  const key = buildPhoneKey(phoneCountryCode, phone);
  return key ? `phone:${key}` : "";
}

function resolveLookupKeys({ email, phone, phoneCountryCode }) {
  return [emailLookupKey(email), phoneLookupKey(phoneCountryCode, phone)].filter(Boolean);
}

function toTtlSeconds(otpExpire, cooldownUntil) {
  const nowSec = Math.floor(Date.now() / 1000);
  const cooldownMinutes = Number(config.otpCooldownMinutes) || 10;
  const candidates = [
    Math.floor(new Date(otpExpire).getTime() / 1000),
    cooldownUntil ? Math.floor(new Date(cooldownUntil).getTime() / 1000) : 0,
    // Keep rate-limit metadata alive at least for the cooldown window.
    nowSec + cooldownMinutes * 60 + 60,
  ].filter((n) => Number.isFinite(n) && n > 0);

  return candidates.length ? Math.max(...candidates) : nowSec + 600;
}

/**
 * Load registration OTP / rate-limit metadata without clearing expired codes.
 * Used for send cooldown checks.
 */
async function getRegistrationOtpRecord(identifiers) {
  const keys = resolveLookupKeys(identifiers);
  for (const lookupKey of keys) {
    const { Item } = await docClient.send(
      new GetCommand({
        TableName: TABLE,
        Key: { lookupKey },
      })
    );
    if (Item) return Item;
  }
  return null;
}

async function saveRegistrationOtp(
  identifiers,
  { otp, otpExpire, otpSendCount = 1, otpCooldownUntil = null }
) {
  const keys = resolveLookupKeys(identifiers);
  if (!keys.length) return;

  const now = new Date().toISOString();
  const itemBase = {
    otp: String(otp),
    otpExpire,
    otpSendCount: Number(otpSendCount) || 1,
    otpCooldownUntil: otpCooldownUntil || null,
    ttl: toTtlSeconds(otpExpire, otpCooldownUntil),
    createdAt: now,
    updatedAt: now,
  };

  await Promise.all(
    keys.map((lookupKey) =>
      docClient.send(
        new PutCommand({
          TableName: TABLE,
          Item: { lookupKey, ...itemBase },
        })
      )
    )
  );
}

async function findRegistrationOtp(identifiers) {
  const keys = resolveLookupKeys(identifiers);
  for (const lookupKey of keys) {
    const { Item } = await docClient.send(
      new GetCommand({
        TableName: TABLE,
        Key: { lookupKey },
      })
    );
    if (!Item) continue;
    if (isOtpExpired(Item.otpExpire)) {
      // Keep rate-limit metadata; only clear the usable code fields conceptually
      // by treating verify as missing. Full delete happens on successful register.
      return null;
    }
    return Item;
  }
  return null;
}

async function deleteRegistrationOtp(identifiers) {
  const keys = resolveLookupKeys(identifiers);
  if (!keys.length) return;

  const deleteRequests = keys.map((lookupKey) => ({
    DeleteRequest: { Key: { lookupKey } },
  }));

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [TABLE]: deleteRequests,
      },
    })
  );
}

async function verifyRegistrationOtp(identifiers, otp) {
  const entry = await findRegistrationOtp(identifiers);
  if (!entry) return { ok: false, reason: "missing" };
  if (String(entry.otp) !== String(otp).trim()) {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true };
}

module.exports = {
  TABLE,
  saveRegistrationOtp,
  getRegistrationOtpRecord,
  findRegistrationOtp,
  deleteRegistrationOtp,
  verifyRegistrationOtp,
};
