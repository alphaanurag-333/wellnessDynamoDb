import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAdminRealtime } from "./AdminRealtimeContext.jsx";
import {
  subscribeClientProfile,
  unsubscribeClientProfile,
} from "../Socket/adminRealtimeSocket.js";
import { isMockNumericId } from "../utils/isMockNumericId.js";

const ClientProfileRealtimeContext = createContext({
  connected: false,
  subscribed: false,
  subscribeError: null,
  activeUserId: null,
  registerInvalidation: () => () => {},
});

export function useClientProfileRealtime() {
  return useContext(ClientProfileRealtimeContext);
}

export function ClientProfileRealtimeProvider({ userId, enabled = true, children }) {
  const { connected, socket, registerClientProfileInvalidation } = useAdminRealtime();
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeError, setSubscribeError] = useState(null);

  const liveUserId = useMemo(() => {
    const id = String(userId || "").trim();
    if (!id || isMockNumericId(id)) return null;
    return id;
  }, [userId]);

  useEffect(() => {
    if (!enabled || !liveUserId || !socket) {
      setSubscribed(false);
      setSubscribeError(null);
      return undefined;
    }

    let cancelled = false;

    const subscribe = () => {
      if (!socket.connected) {
        setSubscribed(false);
        return;
      }
      void subscribeClientProfile(socket, liveUserId).then((ack) => {
        if (cancelled) return;
        const ok = Boolean(ack?.ok);
        setSubscribed(ok);
        setSubscribeError(ok ? null : String(ack?.message || "Subscribe failed"));
        if (import.meta.env?.DEV) {
          console.info("[Admin socket] clientProfile:subscribe", {
            userId: liveUserId,
            ok,
            message: ack?.message,
            room: ack?.room,
          });
        }
      });
    };

    const onReconnect = () => {
      setSubscribed(false);
      subscribe();
    };

    subscribe();
    socket.on("connect", onReconnect);

    return () => {
      cancelled = true;
      socket.off("connect", onReconnect);
      unsubscribeClientProfile(socket, liveUserId);
      setSubscribed(false);
      setSubscribeError(null);
    };
  }, [enabled, liveUserId, socket]);

  const registerInvalidation = useCallback(
    (domains, callback) => {
      return registerClientProfileInvalidation(domains, (payload) => {
        if (liveUserId && String(payload?.userId || "") !== liveUserId) return;
        callback(payload);
      });
    },
    [liveUserId, registerClientProfileInvalidation],
  );

  const value = useMemo(
    () => ({
      connected,
      subscribed,
      subscribeError,
      activeUserId: liveUserId,
      registerInvalidation,
    }),
    [connected, subscribed, subscribeError, liveUserId, registerInvalidation],
  );

  return (
    <ClientProfileRealtimeContext.Provider value={value}>
      {children}
    </ClientProfileRealtimeContext.Provider>
  );
}
