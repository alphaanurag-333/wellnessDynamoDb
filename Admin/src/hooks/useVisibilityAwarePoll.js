import { useEffect, useRef } from "react";

export const CLIENT_PROFILE_POLL_VISIBLE_MS = 5000;
export const CLIENT_PROFILE_POLL_HIDDEN_MS = 15000;

/**
 * Interval poll with faster cadence while the tab is visible and refresh on window focus.
 * Skips overlapping ticks; failures are swallowed (caller should handle errors).
 */
export function useVisibilityAwarePoll(tick, { enabled = true, visibleMs, hiddenMs } = {}) {
  const tickRef = useRef(tick);
  tickRef.current = tick;
  const inFlightRef = useRef(false);

  const visMs = visibleMs ?? CLIENT_PROFILE_POLL_VISIBLE_MS;
  const hidMs = hiddenMs ?? CLIENT_PROFILE_POLL_HIDDEN_MS;

  useEffect(() => {
    if (!enabled) return undefined;

    const run = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await tickRef.current();
      } catch {
        /* silent poll */
      } finally {
        inFlightRef.current = false;
      }
    };

    let intervalId = null;

    const reschedule = () => {
      if (intervalId) window.clearInterval(intervalId);
      const ms =
        typeof document !== "undefined" && document.visibilityState === "hidden" ? hidMs : visMs;
      intervalId = window.setInterval(run, ms);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        run();
      }
      reschedule();
    };

    const onFocus = () => run();

    reschedule();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, hidMs, visMs]);
}
