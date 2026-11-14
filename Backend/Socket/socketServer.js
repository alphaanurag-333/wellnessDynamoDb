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
 * Token from handshake.auth.token or Authorization: Bearer …
 * @param {import("socket.io").Socket} socket
 */
function handshakeToken(socket) {
  const header = socket.handshake.headers?.authorization;
  const bearer =
    typeof header === "string" ? header.replace(/^Bearer\s+/i, "").trim() : "";
  const authToken = socket.handshake.auth?.token;
  return (typeof authToken === "string" && authToken.trim()) || bearer || "";
}

/**
 * Stable Socket.IO connect_error payload: message + error.data { status, code? }.
 * @param {unknown} err
 * @returns {Error & { data: { status: number, code?: string } }}
 */
function toHandshakeRejection(err) {
  const status = Number(err?.statusCode) || 401;
  const message = String(err?.message || "Unauthorized");
  let code = err?.code ? String(err.code) : undefined;
  if (!code) {
    if (/inactive/i.test(message)) code = "ACCOUNT_INACTIVE";
    else if (status === 403) code = "FORBIDDEN";
    else code = "UNAUTHORIZED";
  }
  const error = new Error(message);
  error.data = { status, code };
  return error;
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

  // Auth must fail in middleware so the client gets connect_error (auto-retryable),
  // not connect-then-disconnect from the connection handler.
  io.use(async (socket, next) => {
    try {
      const token = handshakeToken(socket);
      socket.data.pendingAuth = await socketAuth.resolveSocketAuthFromToken(token);
      next();
    } catch (err) {
      if (process.env.NODE_ENV !== "test") {
        console.warn("[socket] handshake rejected:", err?.message || err);
      }
      next(toHandshakeRejection(err));
    }
  });

  io.on("connection", async (socket) => {
    socket.data.subscribedClientIds = new Set();
    socket.data.actorKind = null;
    socket.data.staffReq = null;
    socket.data.userReq = null;

    const pending = socket.data.pendingAuth;
    delete socket.data.pendingAuth;

    // Unreachable when middleware succeeds; keep socket closed if state is corrupt.
    if (!pending?.kind || !pending?.req) {
      socket.disconnect(true);
      return;
    }

    // Middleware already authenticated; only room setup remains.
    const { kind, req } = pending;
    socket.data.actorKind = kind;

    if (kind === "user") {
      socket.data.userReq = req;
      const userId = String(req.auth?.sub || "").trim();
      if (userId) {
        // Mobile clients auto-join only their own profile room — no subscribe emit needed.
        await socket.join(clientRoom(userId));
        socket.data.subscribedClientIds.add(userId);
      }
    } else {
      socket.data.staffReq = req;
      const accountId = String(req.auth?.sub || "").trim();
      if (accountId) {
        await socket.join(staffRoom(accountId));
      }
      await socket.join(STAFF_BROADCAST_ROOM);
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
        const staffReq = socket.data.staffReq;
        if (!staffReq) throw new Error("Unauthorized");
        const result = await clientProfileRooms.subscribeClientProfile(socket, staffReq, userId);
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

module.exports = {
  attachClientProfileSocket,
  handshakeToken,
  toHandshakeRejection,
};
