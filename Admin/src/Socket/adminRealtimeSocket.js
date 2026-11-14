import { io } from "socket.io-client";
import { getApiBase, isPrivateLanHost } from "../api.js";

export const CLIENT_PROFILE_CHANGED_EVENT = "clientProfile.changed";
export const STAFF_INBOX_CHANGED_EVENT = "staffInbox.changed";

const ACCOUNT_AUTH_STORAGE_KEY = "wellness_account_auth";

/** @type {import("socket.io-client").Socket | null} */
let managedSocket = null;
let managedSocketKey = "";

function readAccessToken() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACCOUNT_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.accessToken ? String(parsed.accessToken) : null;
  } catch {
    return null;
  }
}

function socketOriginFromApiBase(apiBase) {
  const base = String(apiBase || "").trim().replace(/\/$/, "");
  if (!base) return "";
  try {
    const url = new URL(base);
    return `${url.protocol}//${url.host}`;
  } catch {
    return base;
  }
}

/**
 * Hosted API (Alphawizz) proxies `/api/*` to Node; `/socket.io` often hits the SPA.
 * Localhost + private LAN (192.168.x / 10.x) hit Node directly → `/socket.io`.
 */
export function socketIoPathForApiBase(apiBase) {
  const fromEnv =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_SOCKET_PATH
      ? String(import.meta.env.VITE_SOCKET_PATH).trim()
      : "";
  if (fromEnv) return fromEnv;

  try {
    const host = new URL(String(apiBase || "")).hostname.toLowerCase();
    // Direct Node (local + LAN Wi‑Fi). Only hosted Alphawizz needs /api/socket.io.
    if (isPrivateLanHost(host)) {
      return "/socket.io";
    }
    return "/api/socket.io";
  } catch {
    return "/socket.io";
  }
}

export function disconnectAdminRealtimeSocket() {
  if (!managedSocket) return;
  managedSocket.removeAllListeners();
  managedSocket.disconnect();
  managedSocket = null;
  managedSocketKey = "";
}

/** @returns {import("socket.io-client").Socket | null} */
export function connectAdminRealtimeSocket() {
  const token = readAccessToken();
  if (!token) {
    disconnectAdminRealtimeSocket();
    return null;
  }

  const apiBase = getApiBase();
  const origin = socketOriginFromApiBase(apiBase);
  if (!origin) return null;

  const path = socketIoPathForApiBase(apiBase);
  const nextKey = `${origin}|${path}|${token}`;

  if (managedSocket && managedSocketKey === nextKey) {
    if (!managedSocket.connected) managedSocket.connect();
    return managedSocket;
  }

  disconnectAdminRealtimeSocket();

  managedSocket = io(origin, {
    path,
    transports: ["websocket", "polling"],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 16,
    reconnectionDelay: 800,
    autoConnect: true,
  });
  managedSocketKey = nextKey;

  if (import.meta.env?.DEV) {
    console.info("[Admin socket] connecting", { origin, path });
    managedSocket.on("connect", () => {
      console.info("[Admin socket] connected", managedSocket.id);
    });
    managedSocket.on("connect_error", (err) => {
      console.warn("[Admin socket] connect_error:", err?.message || err, { origin, path });
    });
  }

  return managedSocket;
}

export function subscribeClientProfile(socket, userId) {
  return new Promise((resolve) => {
    if (!socket || !userId) {
      resolve({ ok: false, message: "Missing socket or userId" });
      return;
    }

    const finish = (ack) => {
      resolve(ack || { ok: false, message: "No subscribe ack" });
    };

    const timer = window.setTimeout(() => {
      finish({ ok: false, message: "Subscribe timed out" });
    }, 12_000);

    try {
      socket
        .timeout(10_000)
        .emit("clientProfile:subscribe", { userId }, (err, ack) => {
          window.clearTimeout(timer);
          if (err) {
            finish({ ok: false, message: err?.message || "Subscribe failed" });
            return;
          }
          finish(ack);
        });
    } catch {
      window.clearTimeout(timer);
      socket.emit("clientProfile:subscribe", { userId }, (ack) => {
        finish(ack);
      });
    }
  });
}

export function unsubscribeClientProfile(socket, userId) {
  if (!socket || !userId) return;
  socket.emit("clientProfile:unsubscribe", { userId });
}
