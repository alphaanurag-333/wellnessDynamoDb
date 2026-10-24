import { useEffect, useRef } from "react";
import {
  PANEL_SESSION_EXPIRED_EVENT,
  PANEL_SESSION_STORAGE_KEY,
  getPanelSessionExpiryReason,
  isPanelSessionExpired,
  msUntilNextLocalMidnight,
  readPanelSession,
  startPanelSession,
  touchPanelSession,
  announcePanelSessionExpired,
} from "../utils/panelSession.js";

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click", "wheel"];

export function usePanelSessionGuard({ isAuthenticated, onExpired }) {
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    if (!readPanelSession()) startPanelSession();

    let ended = false;

    const expireIfNeeded = () => {
      if (ended) return true;
      const reason = getPanelSessionExpiryReason();
      if (!reason || reason === "missing") return false;
      ended = true;
      announcePanelSessionExpired(reason);
      onExpiredRef.current?.(reason);
      return true;
    };

    if (expireIfNeeded()) return undefined;

    let touchTimer = 0;
    const onActivity = () => {
      if (expireIfNeeded()) return;
      if (touchTimer) return;
      touchTimer = window.setTimeout(() => {
        touchTimer = 0;
        if (!isPanelSessionExpired()) touchPanelSession();
      }, 1000);
    };

    ACTIVITY_EVENTS.forEach((type) => window.addEventListener(type, onActivity, true));
    document.addEventListener("visibilitychange", expireIfNeeded);
    window.addEventListener("focus", expireIfNeeded);

    const intervalId = window.setInterval(expireIfNeeded, 15000);
    let midnightId = window.setTimeout(function armMidnight() {
      expireIfNeeded();
      midnightId = window.setTimeout(armMidnight, msUntilNextLocalMidnight());
    }, msUntilNextLocalMidnight());

    const onStorage = (event) => {
      if (event.key === PANEL_SESSION_STORAGE_KEY && event.newValue == null) {
        if (ended) return;
        ended = true;
        onExpiredRef.current?.("idle");
        return;
      }
      expireIfNeeded();
    };
    window.addEventListener("storage", onStorage);

    const onExpiredEvent = () => {
      if (ended) return;
      ended = true;
      onExpiredRef.current?.("idle");
    };
    window.addEventListener(PANEL_SESSION_EXPIRED_EVENT, onExpiredEvent);

    return () => {
      ended = true;
      if (touchTimer) window.clearTimeout(touchTimer);
      ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, onActivity, true));
      document.removeEventListener("visibilitychange", expireIfNeeded);
      window.removeEventListener("focus", expireIfNeeded);
      window.clearInterval(intervalId);
      window.clearTimeout(midnightId);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PANEL_SESSION_EXPIRED_EVENT, onExpiredEvent);
    };
  }, [isAuthenticated]);
}
