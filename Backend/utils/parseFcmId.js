/** Accepts fcm_id, fcmId, fcm_token, fcmToken. Undefined = omit; empty string = clear. */
function parseFcmIdFromBody(body) {
  if (!body || typeof body !== "object") return undefined;
  const raw = body.fcm_id ?? body.fcmId ?? body.fcm_token ?? body.fcmToken;
  if (raw === undefined || raw === null) return undefined;
  return String(raw).trim() || null;
}

function readFcmToken(item) {
  if (!item) return "";
  const raw =
    item.fcmId ??
    item.fcm_id ??
    item.fcm_token ??
    item.fcmToken;
  return raw != null ? String(raw).trim() : "";
}

module.exports = { parseFcmIdFromBody, readFcmToken };
