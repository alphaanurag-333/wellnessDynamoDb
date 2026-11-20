const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const ioClient = require("socket.io-client");
const { setRealtimeIo } = require("../services/realtimeIo");
const {
  notifyClientProfileChanged,
  emitWelcomeVideoUpdatedForUsers,
  EVENT_NAME,
} = require("../services/clientProfileRealtime");

describe("clientProfile realtime", () => {
  /** @type {import("http").Server | null} */
  let httpServer = null;
  /** @type {import("socket.io").Server | null} */
  let io = null;
  let port = 0;

  before(async () => {
    const app = express();
    httpServer = http.createServer(app);
    io = new Server(httpServer, { cors: { origin: "*" } });
    setRealtimeIo(io);

    io.on("connection", (socket) => {
      socket.on("join-test", (userId) => {
        socket.join(`client:${userId}`);
      });
    });

    await new Promise((resolve) => {
      httpServer.listen(0, "127.0.0.1", () => {
        port = httpServer.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    setRealtimeIo(null);
    if (io) await io.close();
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });

  it("emits clientProfile.changed to room subscribers", async () => {
    const userId = "test-user-uuid";
    const client = ioClient(`http://127.0.0.1:${port}`, {
      transports: ["websocket"],
    });

    await new Promise((resolve, reject) => {
      client.on("connect", resolve);
      client.on("connect_error", reject);
    });

    const received = new Promise((resolve) => {
      client.on(EVENT_NAME, (payload) => resolve(payload));
    });

    client.emit("join-test", userId);
    await new Promise((resolve) => setTimeout(resolve, 50));

    notifyClientProfileChanged({
      userId,
      domain: "food",
      action: "mealLog.created",
      source: "user",
      meta: { date: "2026-01-01" },
    });

    const payload = await received;
    assert.strictEqual(payload.userId, userId);
    assert.strictEqual(payload.domain, "food");
    assert.strictEqual(payload.action, "mealLog.created");

    client.close();
  });

  it("fans out welcomeVideo.updated as staff/coach domain", async () => {
    const userA = "client-a";
    const userB = "client-b";
    const coachId = "coach-1";

    const clientA = ioClient(`http://127.0.0.1:${port}`, { transports: ["websocket"] });
    const clientB = ioClient(`http://127.0.0.1:${port}`, { transports: ["websocket"] });

    await Promise.all([
      new Promise((resolve, reject) => {
        clientA.on("connect", resolve);
        clientA.on("connect_error", reject);
      }),
      new Promise((resolve, reject) => {
        clientB.on("connect", resolve);
        clientB.on("connect_error", reject);
      }),
    ]);

    const receivedA = new Promise((resolve) => {
      clientA.on(EVENT_NAME, (payload) => resolve(payload));
    });
    const receivedB = new Promise((resolve) => {
      clientB.on(EVENT_NAME, (payload) => resolve(payload));
    });

    clientA.emit("join-test", userA);
    clientB.emit("join-test", userB);
    await new Promise((resolve) => setTimeout(resolve, 50));

    emitWelcomeVideoUpdatedForUsers([userA, userB], { coachId, live: true });

    const [payloadA, payloadB] = await Promise.all([receivedA, receivedB]);
    for (const payload of [payloadA, payloadB]) {
      assert.strictEqual(payload.type, EVENT_NAME);
      assert.strictEqual(payload.domain, "coach");
      assert.strictEqual(payload.action, "welcomeVideo.updated");
      assert.strictEqual(payload.source, "staff");
      assert.strictEqual(payload.meta.coachId, coachId);
      assert.strictEqual(payload.meta.live, true);
    }
    assert.strictEqual(payloadA.userId, userA);
    assert.strictEqual(payloadB.userId, userB);

    clientA.close();
    clientB.close();
  });
});
