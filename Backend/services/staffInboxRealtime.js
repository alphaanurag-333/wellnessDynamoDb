const { getRealtimeIo } = require("./realtimeIo");

const EVENT_NAME = "staffInbox.changed";

function staffRoom(accountId) {
  return `staff:${String(accountId || "").trim()}`;
}

const STAFF_BROADCAST_ROOM = "staff:all";

/**
 * @param {object} payload
 * @param {string} [payload.activityId]
 * @param {string} [payload.recipientAccountId]
 * @param {string} [payload.subjectUserId]
 */
function notifyStaffInboxChanged(payload = {}) {
  const io = getRealtimeIo();
  if (!io) return;

  const body = {
    type: EVENT_NAME,
    at: new Date().toISOString(),
    activityId: payload.activityId ? String(payload.activityId) : null,
    recipientAccountId: payload.recipientAccountId
      ? String(payload.recipientAccountId)
      : null,
    subjectUserId: payload.subjectUserId ? String(payload.subjectUserId) : null,
  };

  try {
    io.to(STAFF_BROADCAST_ROOM).emit(EVENT_NAME, body);
    if (body.recipientAccountId) {
      io.to(staffRoom(body.recipientAccountId)).emit(EVENT_NAME, body);
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.error("staffInbox realtime emit failed:", err?.message || err);
    }
  }
}

module.exports = {
  EVENT_NAME,
  STAFF_BROADCAST_ROOM,
  staffRoom,
  notifyStaffInboxChanged,
};
