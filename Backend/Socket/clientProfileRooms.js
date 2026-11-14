const AppError = require("../utils/AppError");
const { getUserById } = require("../models/userModel");
const { assertStaffCanAccessUser } = require("../controllers/staffAccess");
const { clientRoom } = require("../services/clientProfileRealtime");

const MAX_SUBSCRIPTIONS_PER_SOCKET = 8;

/**
 * @param {import("socket.io").Socket} socket
 * @param {object} staffReq — from resolveStaffAuthFromToken
 * @param {string} userId
 */
async function subscribeClientProfile(socket, staffReq, userId) {
  const id = String(userId || "").trim();
  if (!id) throw new AppError("userId required", 400);

  const tracked = socket.data.subscribedClientIds || new Set();
  if (tracked.size >= MAX_SUBSCRIPTIONS_PER_SOCKET && !tracked.has(id)) {
    throw new AppError("Too many client profile subscriptions", 429);
  }

  const user = await getUserById(id);
  if (!user) throw new AppError("User not found", 404);

  await assertStaffCanAccessUser(staffReq, user);

  const room = clientRoom(id);
  await socket.join(room);
  tracked.add(id);
  socket.data.subscribedClientIds = tracked;
  socket.data.activeStaffReq = staffReq;

  return { userId: id, room };
}

/**
 * @param {import("socket.io").Socket} socket
 * @param {string} userId
 */
async function unsubscribeClientProfile(socket, userId) {
  const id = String(userId || "").trim();
  if (!id) return;

  await socket.leave(clientRoom(id));
  const tracked = socket.data.subscribedClientIds;
  if (tracked instanceof Set) tracked.delete(id);
}

module.exports = { subscribeClientProfile, unsubscribeClientProfile };
