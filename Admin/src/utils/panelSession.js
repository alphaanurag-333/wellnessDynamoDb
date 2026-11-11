/** Admin panel client session: 30-minute inactivity logout (not mobile app auth). */

const PANEL_SESSION_STORAGE_KEY = "wellness_account_panel_session";

export const PANEL_SESSION_EXPIRED_EVENT = "wellness:panel-session-expired";
export const PANEL_SESSION_NOTICE_KEY = "wellness_panel_session_notice";

const DEFAULT_IDLE_MS = 30 * 60 * 1000;
const envIdle = Number(typeof import.meta !== "undefined" ? import.meta.env?.VITE_PANEL_IDLE_MS : 0);
export const PANEL_IDLE_MS = envIdle > 0 ? envIdle : DEFAULT_IDLE_MS;

function normalizePanelSession(parsed) {
  if (!parsed || typeof parsed.lastActivityAt !== "number" || !Number.isFinite(parsed.lastActivityAt)) {
    return null;
  }
  return { lastActivityAt: parsed.lastActivityAt };
}

export function readPanelSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PANEL_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return normalizePanelSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writePanelSession(session) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PANEL_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearPanelSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PANEL_SESSION_STORAGE_KEY);
}

export function startPanelSession(atMs = Date.now()) {
  writePanelSession({ lastActivityAt: atMs });
}

export function touchPanelSession(atMs = Date.now()) {
  writePanelSession({ lastActivityAt: atMs });
}

export function getPanelSessionExpiryReason(now = new Date()) {
  const session = readPanelSession();
  if (!session) return "missing";
  if (now.getTime() - session.lastActivityAt >= PANEL_IDLE_MS) return "idle";
  return null;
}

export function isPanelSessionExpired(now = new Date()) {
  const reason = getPanelSessionExpiryReason(now);
  return Boolean(reason && reason !== "missing");
}

/** Milliseconds until idle expiry; at least 1s when session exists and is valid. */
export function msUntilPanelIdleExpiry(now = new Date()) {
  const session = readPanelSession();
  if (!session) return PANEL_IDLE_MS;
  const remaining = PANEL_IDLE_MS - (now.getTime() - session.lastActivityAt);
  return Math.max(1000, remaining);
}

export function setPanelSessionNotice(reason) {
  if (typeof window === "undefined") return;
  if (reason === "idle") {
    window.sessionStorage.setItem(PANEL_SESSION_NOTICE_KEY, "idle");
  }
}

export function consumePanelSessionNotice() {
  if (typeof window === "undefined") return null;
  const reason = window.sessionStorage.getItem(PANEL_SESSION_NOTICE_KEY);
  window.sessionStorage.removeItem(PANEL_SESSION_NOTICE_KEY);
  if (reason === "day") return "idle";
  return reason;
}

export function announcePanelSessionExpired(_reason = "idle") {
  setPanelSessionNotice("idle");
  clearPanelSession();
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PANEL_SESSION_EXPIRED_EVENT, { detail: { reason: "idle" } }));
}

export function ensurePanelSessionForAuth(auth) {
  if (!auth?.accessToken) return { expired: false, reason: null };

  const now = new Date();
  const existing = readPanelSession();
  if (existing) {
    const reason = getPanelSessionExpiryReason(now);
    if (reason && reason !== "missing") return { expired: true, reason };
    return { expired: false, reason: null };
  }

  startPanelSession(now.getTime());
  return { expired: false, reason: null };
}

export { PANEL_SESSION_STORAGE_KEY };
