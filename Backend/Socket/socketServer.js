const { Server } = require("socket.io");
const config = require("../config");
const { setRealtimeIo } = require("../services/realtimeIo");
const { STAFF_BROADCAST_ROOM, staffRoom } = require("../services/staffInboxRealtime");
const { clientRoom } = require("../services/clientProfileRealtime");
const socketAuth = require("./resolveSocketAuthFromToken");
const clientProfileRooms = require("./clientProfileRooms");

function parseCorsOrigins() {
  const raw = config.socketCorsOrigins;
  if (!raw) return true;
  if (raw === "*") return "*";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * @param {import("http").Server} httpServer
 * @returns {import("socket.io").Server | null}
 */
function attachClientProfileSocket(httpServer) {
  if (!config.socketEnabled) {
    setRealtimeIo(null);
    return null;
  }

  const io = new Server(httpServer, {
    path: config.socketPath,
    cors: {
      origin: parseCorsOrigins(),
      credentials: true,
    },
  });

  setRealtimeIo(io);

  io.on("connection", async (socket) => {
    socket.data.subscribedClientIds = new Set();
    socket.data.actorKind = null;
    socket.data.staffReq = null;
    socket.data.userReq = null;

    const token = socket.handshake.auth?.token;
    try {
      const { kind, req } = await socketAuth.resolveSocketAuthFromToken(token);
      socket.data.actorKind = kind;

      if (kind === "user") {
        socket.data.userReq = req;
        const userId = String(req.auth?.sub || "").trim();
        if (!userId) throw new Error("Unauthorized");
        // Mobile clients auto-join only their own profile room — no subscribe emit needed.
        await socket.join(clientRoom(userId));
        socket.data.subscribedClientIds.add(userId);
      } else {
        socket.data.staffReq = req;
        const accountId = String(req.auth?.sub || "").trim();
        if (accountId) {
          await socket.join(staffRoom(accountId));
        }
        await socket.join(STAFF_BROADCAST_ROOM);
      }
    } catch (err) {
      socket.disconnect(true);
      return;
    }

    socket.on("clientProfile:subscribe", async (payload, ack) => {
      const respond = typeof ack === "function" ? ack : () => {};
      try {
        // Staff-only: users already auto-joined their own room and must not join others.
        if (socket.data.actorKind !== "staff") {
          const err = new Error("Forbidden");
          err.statusCode = 403;
          throw err;
        }
        const userId = payload?.userId;
        const req = socket.data.staffReq;
        if (!req) throw new Error("Unauthorized");
        const result = await clientProfileRooms.subscribeClientProfile(socket, req, userId);
        respond({ ok: true, ...result });
      } catch (err) {
        respond({
          ok: false,
          message: err?.message || "Subscribe failed",
          status: err?.statusCode || 400,
        });
      }
    });

    socket.on("clientProfile:unsubscribe", async (payload, ack) => {
      const respond = typeof ack === "function" ? ack : () => {};
      try {
        if (socket.data.actorKind !== "staff") {
          const err = new Error("Forbidden");
          err.statusCode = 403;
          throw err;
        }
        await clientProfileRooms.unsubscribeClientProfile(socket, payload?.userId);
        respond({ ok: true });
      } catch (err) {
        respond({
          ok: false,
          message: err?.message || "Unsubscribe failed",
          status: err?.statusCode || 400,
        });
      }
    });

    socket.on("disconnect", () => {
      socket.data.subscribedClientIds = new Set();
    });
  });

  if (config.nodeEnv !== "test") {
    console.log(`Client profile Socket.IO enabled (path: ${config.socketPath})`);
  }

  return io;
}

module.exports = { attachClientProfileSocket };
