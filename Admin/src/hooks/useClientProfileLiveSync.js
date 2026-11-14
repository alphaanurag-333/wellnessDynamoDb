import { useEffect, useRef } from "react";
import { useClientProfileRealtime } from "../context/ClientProfileRealtimeContext.jsx";

/**
 * Socket-only live profile: no interval polling.
 * Runs a one-shot resync on socket reconnect, window focus, and tab visible (covers missed events).
 */
export function useClientProfileLiveSync(tick, { enabled = true } = {}) {
  const { connected, subscribed } = useClientProfileRealtime();
  const tickRef = useRef(tick);
  tickRef.current = tick;
  const wasLiveRef = useRef(false);

  const liveReady = connected && subscribed;

  useEffect(() => {
    if (!enabled) return;
    if (liveReady && !wasLiveRef.current) {
      wasLiveRef.current = true;
      void tickRef.current();
    }
    if (!liveReady) {
      wasLiveRef.current = false;
    }
  }, [liveReady, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;

    const run = () => {
      void tickRef.current();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };
    const onFocus = () => run();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled]);

  return { socketConnected: liveReady };
}
