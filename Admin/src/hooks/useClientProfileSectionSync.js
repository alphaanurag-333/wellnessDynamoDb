import { useCallback, useRef } from "react";
import { useClientProfileInvalidation } from "./useClientProfileInvalidation.js";
import { useClientProfileLiveSync } from "./useClientProfileLiveSync.js";

/**
 * Shared socket live-sync for client-profile sections.
 * Runs `onSync` on domain invalidation, reconnect, focus, and tab visible.
 *
 * @param {string[]} domains
 * @param {() => void | Promise<void | boolean>} onSync
 *   Return `true` when data was applied (optional; enables a second pull for read races).
 * @param {{ enabled?: boolean, shouldSkip?: () => boolean, doublePull?: boolean }} [options]
 */
export function useClientProfileSectionSync(domains, onSync, options = {}) {
  const { enabled = true, shouldSkip, doublePull = true } = options;
  const pollInFlightRef = useRef(false);
  const onSyncRef = useRef(onSync);
  const skipRef = useRef(shouldSkip);
  onSyncRef.current = onSync;
  skipRef.current = shouldSkip;

  const tick = useCallback(async (payload) => {
    if (!enabled || pollInFlightRef.current) return;
    if (skipRef.current?.()) return;

    pollInFlightRef.current = true;
    try {
      const pull = async () => {
        if (skipRef.current?.()) return true;
        return Boolean(await onSyncRef.current?.(payload));
      };
      if (await pull()) return;
      if (doublePull) await pull();
    } catch {
      /* socket resync is best-effort */
    } finally {
      pollInFlightRef.current = false;
    }
  }, [doublePull, enabled]);

  useClientProfileInvalidation(domains, tick, { enabled, shouldSkip });
  useClientProfileLiveSync(tick, { enabled });
}
