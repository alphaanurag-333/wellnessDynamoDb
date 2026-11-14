/** @typedef {"glance"|"personal"|"body"|"medical"|"internal"|"launch"|"food"|"bms"|"nutritions"|"healthProgress"|"reflection"|"prescription"|"presentable"|"exchange"|"counselling"|"protocol"|"gut"} ClientProfileDomain */

const EVENT_NAME = "clientProfile.changed";

const { getRealtimeIo } = require("./realtimeIo");

function clientRoom(userId) {
  return `client:${String(userId || "").trim()}`;
}

/**
 * @param {object} payload
 * @param {string} payload.userId
 * @param {ClientProfileDomain} payload.domain
 * @param {string} payload.action
 * @param {"user"|"staff"|"system"} [payload.source]
 * @param {Record<string, unknown>} [payload.meta]
 */
function notifyClientProfileChanged({
  userId,
  domain,
  action,
  source = "system",
  meta = {},
}) {
  const id = String(userId || "").trim();
  const ioInstance = getRealtimeIo();
  if (!id || !ioInstance) return;

  const body = {
    type: EVENT_NAME,
    userId: id,
    domain: String(domain || "").trim(),
    action: String(action || "").trim(),
    at: new Date().toISOString(),
    source,
    meta: meta && typeof meta === "object" ? meta : {},
  };

  const room = clientRoom(id);
  try {
    const subscribers = ioInstance.sockets?.adapter?.rooms?.get(room)?.size || 0;
    if (process.env.NODE_ENV !== "test") {
      console.log(
        `[realtime] emit ${EVENT_NAME} room=${room} domain=${body.domain} action=${body.action} subscribers=${subscribers}`,
      );
    }
    ioInstance.to(room).emit(EVENT_NAME, body);
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.error("clientProfile realtime emit failed:", err?.message || err);
    }
  }
}

/**
 * @param {import("express").Request} req
 * @returns {"user"|"staff"}
 */
function clientProfileSourceFromReq(req) {
  const role = String(req?.auth?.role || "").trim();
  if (role === "user") return "user";
  return "staff";
}

/**
 * @param {import("express").Request} req
 * @param {string} userId
 * @param {ClientProfileDomain} domain
 * @param {string} action
 * @param {Record<string, unknown>} [meta]
 */
function notifyClientProfileFromReq(req, userId, domain, action, meta) {
  notifyClientProfileChanged({
    userId,
    domain,
    action,
    meta,
    source: clientProfileSourceFromReq(req),
  });
}

module.exports = {
  EVENT_NAME,
  clientRoom,
  notifyClientProfileChanged,
  notifyClientProfileFromReq,
  clientProfileSourceFromReq,
};
