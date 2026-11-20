/** @typedef {"glance"|"personal"|"body"|"medical"|"internal"|"launch"|"food"|"bms"|"nutritions"|"healthProgress"|"reflection"|"prescription"|"presentable"|"exchange"|"counselling"|"protocol"|"gut"|"coach"|"welcomeVideo"} ClientProfileDomain */

const EVENT_NAME = "clientProfile.changed";

const { getRealtimeIo } = require("./realtimeIo");
const { listUsersByParentCoachId } = require("../models/userModel");

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
 * Emit welcome-video update to each assigned client room.
 * Always uses source "staff" so mobile does not treat this as a user self-edit.
 *
 * @param {string[]} userIds
 * @param {{ coachId: string, live?: boolean }} meta
 */
function emitWelcomeVideoUpdatedForUsers(userIds, { coachId, live = false } = {}) {
  const coach = String(coachId || "").trim();
  if (!coach) return;

  const ids = Array.isArray(userIds) ? userIds : [];
  for (const rawId of ids) {
    const userId = String(rawId || "").trim();
    if (!userId) continue;
    notifyClientProfileChanged({
      userId,
      domain: "coach",
      action: "welcomeVideo.updated",
      source: "staff",
      meta: { coachId: coach, live: Boolean(live) },
    });
  }
}

/**
 * Resolve clients under a wellness coach and emit clientProfile.changed once per user.
 * Safe to call fire-and-forget after a successful coach intro write.
 *
 * @param {string} coachId
 * @param {{ live?: boolean }} [options]
 */
async function notifyCoachWelcomeVideoUpdated(coachId, { live = false } = {}) {
  const id = String(coachId || "").trim();
  if (!id) return;

  const { users } = await listUsersByParentCoachId(id, {
    unpaginated: true,
    userTier: "client",
  });

  emitWelcomeVideoUpdatedForUsers(
    (users || []).map((user) => user.id),
    { coachId: id, live: Boolean(live) },
  );
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
  emitWelcomeVideoUpdatedForUsers,
  notifyCoachWelcomeVideoUpdated,
};
