const { Server } = require("socket.io");
const config = require("../config");
const { setRealtimeIo } = require("../services/realtimeIo");
const { STAFF_BROADCAST_ROOM, staffRoom } = require("../services/staffInboxRealtime");
const { resolveStaffAuthFromToken } = require("./staffAuthFromToken");
const { subscribeClientProfile, unsubscribeClientProfile } = require("./clientProfileRooms");

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

    const token = socket.handshake.auth?.token;
    try {
      const { req } = await resolveStaffAuthFromToken(token);
      socket.data.staffReq = req;
      const accountId = String(req.auth?.sub || "").trim();
      if (accountId) {
        await socket.join(staffRoom(accountId));
      }
      await socket.join(STAFF_BROADCAST_ROOM);
    } catch (err) {
      socket.disconnect(true);
      return;
    }

    socket.on("clientProfile:subscribe", async (payload, ack) => {
      const respond = typeof ack === "function" ? ack : () => {};
      try {
        const userId = payload?.userId;
        const req = socket.data.staffReq;
        if (!req) throw new Error("Unauthorized");
        const result = await subscribeClientProfile(socket, req, userId);
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
        await unsubscribeClientProfile(socket, payload?.userId);
        respond({ ok: true });
      } catch (err) {
        respond({ ok: false, message: err?.message || "Unsubscribe failed" });
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
