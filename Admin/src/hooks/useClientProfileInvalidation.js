import { useEffect, useRef } from "react";
import { useClientProfileRealtime } from "../context/ClientProfileRealtimeContext.jsx";

function domainsKeyFromList(domains) {
  if (!Array.isArray(domains) || domains.length === 0) return "";
  return [...new Set(domains.map((d) => String(d || "").trim()).filter(Boolean))]
    .sort()
    .join("\0");
}

/**
 * Run `onInvalidate` when socket events arrive for any listed domain.
 * @param {string[]} domains
 * @param {(payload?: object) => void | Promise<void>} onInvalidate
 * @param {{ enabled?: boolean, shouldSkip?: () => boolean }} [options]
 */
export function useClientProfileInvalidation(domains, onInvalidate, options = {}) {
  const { enabled = true, shouldSkip } = options;
  const { registerInvalidation, activeUserId } = useClientProfileRealtime();
  const onRef = useRef(onInvalidate);
  const skipRef = useRef(shouldSkip);
  onRef.current = onInvalidate;
  skipRef.current = shouldSkip;

  // Content-stable key so inline arrays like `["body"]` do not re-subscribe every render.
  const domainsKey = domainsKeyFromList(domains);

  useEffect(() => {
    if (!enabled || !activeUserId || !domainsKey) return undefined;

    const handler = (payload) => {
      if (skipRef.current?.()) return;
      void onRef.current?.(payload);
    };

    return registerInvalidation(domainsKey.split("\0"), handler);
  }, [activeUserId, domainsKey, enabled, registerInvalidation]);
}
