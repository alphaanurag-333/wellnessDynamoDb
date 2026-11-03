import { beforeEach, describe, expect, it } from "vitest";
import {
  PANEL_IDLE_MS,
  PANEL_SESSION_STORAGE_KEY,
  clearPanelSession,
  ensurePanelSessionForAuth,
  getPanelSessionExpiryReason,
  isPanelSessionExpired,
  msUntilPanelIdleExpiry,
  readPanelSession,
  startPanelSession,
  touchPanelSession,
} from "./panelSession.js";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("panelSession", () => {
  it("startPanelSession and touchPanelSession persist lastActivityAt", () => {
    startPanelSession(1000);
    expect(readPanelSession()).toEqual({ lastActivityAt: 1000 });
    touchPanelSession(2000);
    expect(readPanelSession()).toEqual({ lastActivityAt: 2000 });
  });

  it("accepts legacy payloads that include sessionDay", () => {
    localStorage.setItem(
      PANEL_SESSION_STORAGE_KEY,
      JSON.stringify({ lastActivityAt: 5000, sessionDay: "2020-01-01" }),
    );
    expect(readPanelSession()).toEqual({ lastActivityAt: 5000 });
  });

  it("expires only after 30 minutes of inactivity", () => {
    const start = 1_000_000;
    startPanelSession(start);
    expect(getPanelSessionExpiryReason(new Date(start + PANEL_IDLE_MS - 1))).toBe(null);
    expect(isPanelSessionExpired(new Date(start + PANEL_IDLE_MS - 1))).toBe(false);
    expect(getPanelSessionExpiryReason(new Date(start + PANEL_IDLE_MS))).toBe("idle");
    expect(isPanelSessionExpired(new Date(start + PANEL_IDLE_MS))).toBe(true);
  });

  it("does not expire at midnight when activity was recent", () => {
    const lastActive = new Date(2026, 0, 15, 23, 55, 0).getTime();
    startPanelSession(lastActive);
    const afterMidnight = new Date(2026, 0, 16, 0, 5, 0);
    expect(getPanelSessionExpiryReason(afterMidnight)).toBe(null);
  });

  it("msUntilPanelIdleExpiry reflects remaining idle time", () => {
    const start = 10_000;
    startPanelSession(start);
    const now = new Date(start + 60_000);
    expect(msUntilPanelIdleExpiry(now)).toBe(PANEL_IDLE_MS - 60_000);
  });

  it("ensurePanelSessionForAuth starts session when missing", () => {
    const result = ensurePanelSessionForAuth({ accessToken: "token" });
    expect(result).toEqual({ expired: false, reason: null });
    expect(readPanelSession()?.lastActivityAt).toBeTypeOf("number");
  });

  it("ensurePanelSessionForAuth reports idle expiry", () => {
    const start = 0;
    startPanelSession(start);
    const result = ensurePanelSessionForAuth({ accessToken: "token" });
    expect(result).toEqual({ expired: true, reason: "idle" });
  });

  it("clearPanelSession removes storage", () => {
    startPanelSession();
    clearPanelSession();
    expect(readPanelSession()).toBe(null);
    expect(getPanelSessionExpiryReason()).toBe("missing");
  });
});
