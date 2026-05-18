const { PutCommand, GetCommand, DeleteCommand, BatchWriteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { isOtpExpired } = require("../utils/otp");
const { normalizeEmail, buildPhoneKey } = require("./userModel");

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

function toTtlSeconds(otpExpire) {
  const seconds = Math.floor(new Date(otpExpire).getTime() / 1000);
  return Number.isFinite(seconds) ? seconds : Math.floor(Date.now() / 1000) + 600;
}

async function saveRegistrationOtp(identifiers, { otp, otpExpire }) {
  const keys = resolveLookupKeys(identifiers);
  if (!keys.length) return;

  const now = new Date().toISOString();
  const itemBase = {
    otp: String(otp),
    otpExpire,
    ttl: toTtlSeconds(otpExpire),
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
      await deleteRegistrationOtp(identifiers);
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
  findRegistrationOtp,
  deleteRegistrationOtp,
  verifyRegistrationOtp,
};
