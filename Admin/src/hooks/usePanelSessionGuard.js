import { useEffect, useRef } from "react";
import {
  PANEL_SESSION_EXPIRED_EVENT,
  PANEL_SESSION_STORAGE_KEY,
  getPanelSessionExpiryReason,
  isPanelSessionExpired,
  msUntilPanelIdleExpiry,
  readPanelSession,
  startPanelSession,
  touchPanelSession,
  announcePanelSessionExpired,
} from "../utils/panelSession.js";

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "keyup",
  "scroll",
  "touchstart",
  "click",
  "wheel",
  "pointerdown",
  "pointermove",
  "input",
];

export function usePanelSessionGuard({ isAuthenticated, onExpired }) {
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    if (!readPanelSession()) startPanelSession();

    let ended = false;
    let idleDeadlineId = 0;

    const clearIdleDeadline = () => {
      if (idleDeadlineId) {
        window.clearTimeout(idleDeadlineId);
        idleDeadlineId = 0;
      }
    };

    const scheduleIdleDeadline = () => {
      clearIdleDeadline();
      if (ended || isPanelSessionExpired()) return;
      idleDeadlineId = window.setTimeout(() => {
        idleDeadlineId = 0;
        expireIfNeeded();
      }, msUntilPanelIdleExpiry());
    };

    const expireIfNeeded = () => {
      if (ended) return true;
      const reason = getPanelSessionExpiryReason();
      if (!reason || reason === "missing") return false;
      ended = true;
      clearIdleDeadline();
      announcePanelSessionExpired(reason);
      onExpiredRef.current?.(reason);
      return true;
    };

    if (expireIfNeeded()) return undefined;

    scheduleIdleDeadline();

    let touchTimer = 0;
    const onActivity = () => {
      if (expireIfNeeded()) return;
      if (touchTimer) return;
      touchTimer = window.setTimeout(() => {
        touchTimer = 0;
        if (isPanelSessionExpired()) {
          expireIfNeeded();
          return;
        }
        touchPanelSession();
        scheduleIdleDeadline();
      }, 1000);
    };

    ACTIVITY_EVENTS.forEach((type) => window.addEventListener(type, onActivity, true));
    const onVisibilityOrFocus = () => {
      if (expireIfNeeded()) return;
      scheduleIdleDeadline();
    };
    document.addEventListener("visibilitychange", onVisibilityOrFocus);
    window.addEventListener("focus", onVisibilityOrFocus);

    const intervalId = window.setInterval(expireIfNeeded, 15000);

    const onStorage = (event) => {
      if (event.key === PANEL_SESSION_STORAGE_KEY && event.newValue == null) {
        if (ended) return;
        ended = true;
        clearIdleDeadline();
        onExpiredRef.current?.("idle");
        return;
      }
      if (expireIfNeeded()) return;
      scheduleIdleDeadline();
    };
    window.addEventListener("storage", onStorage);

    const onExpiredEvent = () => {
      if (ended) return;
      ended = true;
      clearIdleDeadline();
      onExpiredRef.current?.("idle");
    };
    window.addEventListener(PANEL_SESSION_EXPIRED_EVENT, onExpiredEvent);

    return () => {
      ended = true;
      clearIdleDeadline();
      if (touchTimer) window.clearTimeout(touchTimer);
      ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, onActivity, true));
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
      window.removeEventListener("focus", onVisibilityOrFocus);
      window.clearInterval(intervalId);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PANEL_SESSION_EXPIRED_EVENT, onExpiredEvent);
    };
  }, [isAuthenticated]);
}
