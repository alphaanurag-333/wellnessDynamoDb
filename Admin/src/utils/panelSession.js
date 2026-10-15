const PANEL_SESSION_STORAGE_KEY = "wellness_account_panel_session";

export const PANEL_SESSION_EXPIRED_EVENT = "wellness:panel-session-expired";
export const PANEL_SESSION_NOTICE_KEY = "wellness_panel_session_notice";
export const PANEL_IDLE_MS = 15 * 60 * 1000;

export function localCalendarDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function readPanelSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PANEL_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.lastActivityAt !== "number" || !parsed.sessionDay) return null;
    return parsed;
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

export function startPanelSession() {
  const now = Date.now();
  writePanelSession({ lastActivityAt: now, sessionDay: localCalendarDateKey() });
}

export function touchPanelSession() {
  const current = readPanelSession();
  writePanelSession({
    lastActivityAt: Date.now(),
    sessionDay: current?.sessionDay || localCalendarDateKey(),
  });
}

export function getPanelSessionExpiryReason(now = new Date()) {
  const session = readPanelSession();
  if (!session) return "missing";
  if (session.sessionDay !== localCalendarDateKey(now)) return "day";
  if (now.getTime() - session.lastActivityAt >= PANEL_IDLE_MS) return "idle";
  return null;
}

export function isPanelSessionExpired(now = new Date()) {
  const reason = getPanelSessionExpiryReason(now);
  return Boolean(reason && reason !== "missing");
}

export function setPanelSessionNotice(reason) {
  if (typeof window === "undefined") return;
  if (reason === "idle" || reason === "day") {
    window.sessionStorage.setItem(PANEL_SESSION_NOTICE_KEY, reason);
  }
}

export function consumePanelSessionNotice() {
  if (typeof window === "undefined") return null;
  const reason = window.sessionStorage.getItem(PANEL_SESSION_NOTICE_KEY);
  window.sessionStorage.removeItem(PANEL_SESSION_NOTICE_KEY);
  return reason;
}

export function announcePanelSessionExpired(reason) {
  const noticeReason = reason === "day" ? "day" : "idle";
  setPanelSessionNotice(noticeReason);
  clearPanelSession();
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PANEL_SESSION_EXPIRED_EVENT, { detail: { reason: noticeReason } }));
}

export function msUntilNextLocalMidnight(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(1000, next.getTime() - now.getTime());
}

function decodeJwtIssuedAtMs(accessToken) {
  if (!accessToken || typeof accessToken !== "string") return null;
  const parts = accessToken.split(".");
  if (parts.length < 2) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    const issuedAt = Number(payload?.iat);
    return Number.isFinite(issuedAt) ? issuedAt * 1000 : null;
  } catch {
    return null;
  }
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

  const issuedAtMs = decodeJwtIssuedAtMs(auth.accessToken);
  if (issuedAtMs && localCalendarDateKey(new Date(issuedAtMs)) !== localCalendarDateKey(now)) {
    return { expired: true, reason: "day" };
  }

  startPanelSession();
  return { expired: false, reason: null };
}

export { PANEL_SESSION_STORAGE_KEY };
