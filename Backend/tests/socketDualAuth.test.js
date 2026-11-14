const { describe, it, mock, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const path = require("path");
const express = require("express");
const ioClient = require("socket.io-client");

process.env.SOCKET_ENABLED = "true";
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "socket-dual-auth-test-secret";
}

function clearSocketModules() {
  const sep = path.sep;
  for (const key of Object.keys(require.cache)) {
    if (
      key.includes(`${sep}Socket${sep}`) ||
      key.endsWith(`${sep}config${sep}index.js`) ||
      key.endsWith(`${sep}services${sep}realtimeIo.js`) ||
      key.endsWith(`${sep}utils${sep}jwt.js`) ||
      key.endsWith(`${sep}models${sep}userModel.js`)
    ) {
      delete require.cache[key];
    }
  }
}

describe("resolveUserAuthFromToken", () => {
  beforeEach(() => {
    mock.reset();
  });

  it("accepts a valid user JWT with matching sessionVersion", async () => {
    clearSocketModules();
    const userModel = require("../models/userModel");
    mock.method(userModel, "getUserById", async (id) => ({
      id,
      status: "active",
      sessionVersion: 2,
    }));

    const { signAccessToken } = require("../utils/jwt");
    const { resolveUserAuthFromToken } = require("../Socket/userAuthFromToken");

    const token = signAccessToken({ sub: "user-1", role: "user", sv: 2 });
    const { req } = await resolveUserAuthFromToken(token);

    assert.equal(req.auth.role, "user");
    assert.equal(req.auth.sub, "user-1");
    assert.equal(req.auth.sv, 2);
    assert.equal(req.user.id, "user-1");
  });

  it("rejects sessionVersion mismatch", async () => {
    clearSocketModules();
    const userModel = require("../models/userModel");
    mock.method(userModel, "getUserById", async (id) => ({
      id,
      status: "active",
      sessionVersion: 5,
    }));

    const { signAccessToken } = require("../utils/jwt");
    const { resolveUserAuthFromToken } = require("../Socket/userAuthFromToken");

    const token = signAccessToken({ sub: "user-1", role: "user", sv: 1 });
    await assert.rejects(
      () => resolveUserAuthFromToken(token),
      (err) => err.statusCode === 401 && err.code === "SESSION_REPLACED",
    );
  });

  it("rejects non-user roles", async () => {
    clearSocketModules();
    const { signAccessToken } = require("../utils/jwt");
    const { resolveUserAuthFromToken } = require("../Socket/userAuthFromToken");

    const token = signAccessToken({ sub: "admin-1", role: "admin" });
    await assert.rejects(
      () => resolveUserAuthFromToken(token),
      (err) => err.statusCode === 403,
    );
  });
});

describe("resolveSocketAuthFromToken routing", () => {
  beforeEach(() => {
    mock.reset();
  });

  it("routes role=user to user auth", async () => {
    clearSocketModules();
    const userModel = require("../models/userModel");
    mock.method(userModel, "getUserById", async (id) => ({
      id,
      status: "active",
      sessionVersion: 0,
    }));

    const { signAccessToken } = require("../utils/jwt");
    const { resolveSocketAuthFromToken } = require("../Socket/resolveSocketAuthFromToken");

    const token = signAccessToken({ sub: "user-42", role: "user", sv: 0 });
    const result = await resolveSocketAuthFromToken(token);

    assert.equal(result.kind, "user");
    assert.equal(result.req.auth.sub, "user-42");
  });
});

describe("attachClientProfileSocket handshake", () => {
  /** @type {import("http").Server | null} */
  let httpServer = null;
  let port = 0;
  /** @type {import("socket.io").Server | null} */
  let io = null;

  before(async () => {
    clearSocketModules();
    process.env.SOCKET_ENABLED = "true";

    const socketAuth = require("../Socket/resolveSocketAuthFromToken");
    mock.method(socketAuth, "resolveSocketAuthFromToken", async (token) => {
      if (token === "user-token") {
        return {
          kind: "user",
          req: { auth: { role: "user", sub: "user-abc", sv: 0 }, user: { id: "user-abc" } },
        };
      }
      if (token === "staff-token") {
        return {
          kind: "staff",
          req: {
            auth: { role: "admin", sub: "staff-1", permissions: [] },
            user: { id: "staff-1" },
            account: { id: "staff-1" },
          },
        };
      }
      const err = new Error("Unauthorized");
      err.statusCode = 401;
      throw err;
    });

    const rooms = require("../Socket/clientProfileRooms");
    mock.method(rooms, "subscribeClientProfile", async (_socket, _req, userId) => ({
      userId,
      room: `client:${userId}`,
    }));
    mock.method(rooms, "unsubscribeClientProfile", async () => {});

    const { attachClientProfileSocket } = require("../Socket/socketServer");
    const app = express();
    httpServer = http.createServer(app);
    io = attachClientProfileSocket(httpServer);
    assert.ok(io, "socket server should attach when SOCKET_ENABLED=true");

    await new Promise((resolve) => {
      httpServer.listen(0, "127.0.0.1", () => {
        port = httpServer.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    const { setRealtimeIo } = require("../services/realtimeIo");
    setRealtimeIo(null);
    if (io) await io.close();
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
    mock.reset();
    clearSocketModules();
  });

  it("auto-joins user to client:{ownUserId} and forbids subscribe to others", async () => {
    const client = ioClient(`http://127.0.0.1:${port}`, {
      transports: ["websocket"],
      auth: { token: "user-token" },
    });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("connect timeout")), 5000);
      client.on("connect", () => {
        clearTimeout(timer);
        resolve();
      });
      client.on("connect_error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    // Auth runs in the connection handler; allow join to settle.
    await new Promise((resolve) => setTimeout(resolve, 50));

    const room = "client:user-abc";
    const size = io.sockets.adapter.rooms.get(room)?.size || 0;
    assert.equal(size, 1, "user socket should be in own client room");

    const ack = await new Promise((resolve) => {
      client.emit("clientProfile:subscribe", { userId: "someone-else" }, resolve);
    });
    assert.equal(ack.ok, false);
    assert.equal(ack.status, 403);

    client.close();
  });

  it("keeps staff subscribe working", async () => {
    const client = ioClient(`http://127.0.0.1:${port}`, {
      transports: ["websocket"],
      auth: { token: "staff-token" },
    });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("connect timeout")), 5000);
      client.on("connect", () => {
        clearTimeout(timer);
        resolve();
      });
      client.on("connect_error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    const ack = await new Promise((resolve) => {
      client.emit("clientProfile:subscribe", { userId: "client-9" }, resolve);
    });
    assert.equal(ack.ok, true);
    assert.equal(ack.userId, "client-9");

    client.close();
  });

  it("disconnects invalid tokens", async () => {
    const client = ioClient(`http://127.0.0.1:${port}`, {
      transports: ["websocket"],
      auth: { token: "bad-token" },
    });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("expected disconnect")), 3000);
      client.on("disconnect", () => {
        clearTimeout(timer);
        resolve();
      });
      client.on("connect_error", () => {
        clearTimeout(timer);
        resolve();
      });
    });

    client.close();
  });
});
