import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CLIENT_PROFILE_CHANGED_EVENT,
  STAFF_INBOX_CHANGED_EVENT,
  connectAdminRealtimeSocket,
  disconnectAdminRealtimeSocket,
} from "../Socket/adminRealtimeSocket.js";
import { getAccountToken } from "../api/accountApi.js";
import { useViewAs } from "./ViewAsContext.jsx";

const AdminRealtimeContext = createContext({
  connected: false,
  socket: null,
  onStaffInboxChanged: () => () => {},
  registerClientProfileInvalidation: () => () => {},
});

export function useAdminRealtime() {
  return useContext(AdminRealtimeContext);
}

export function AdminRealtimeProvider({ children }) {
  const { isAuthenticated } = useViewAs();
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const inboxListenersRef = useRef(new Set());
  const profileListenersRef = useRef(new Map());

  const authToken = isAuthenticated ? getAccountToken() : null;

  useEffect(() => {
    const token = authToken;
    if (!token) {
      disconnectAdminRealtimeSocket();
      setConnected(false);
      setSocket(null);
      return undefined;
    }

    const nextSocket = connectAdminRealtimeSocket();
    if (!nextSocket) {
      setConnected(false);
      setSocket(null);
      return undefined;
    }
    setSocket(nextSocket);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onInbox = (payload) => {
      inboxListenersRef.current.forEach((fn) => {
        try {
          fn(payload);
        } catch {
          /* listener */
        }
      });
    };

    const onProfile = (payload) => {
      if (!payload?.userId || !payload?.domain) return;
      const domain = String(payload.domain).trim();
      if (import.meta.env?.DEV) {
        console.info("[Admin socket] clientProfile.changed", {
          userId: payload.userId,
          domain,
          action: payload?.action,
          meta: payload?.meta,
        });
      }

      // Dispatch immediately (no setTimeout — browsers throttle timers when the
      // window/tab is unfocused, which matched "updates only after click/focus").
      const seen = new Set();
      const run = (key) => {
        const set = profileListenersRef.current.get(key);
        if (!set) return;
        set.forEach((fn) => {
          if (seen.has(fn)) return;
          seen.add(fn);
          try {
            fn(payload);
          } catch {
            /* listener */
          }
        });
      };
      run(domain);
      run("*");
    };

    nextSocket.on("connect", onConnect);
    nextSocket.on("disconnect", onDisconnect);
    nextSocket.on(STAFF_INBOX_CHANGED_EVENT, onInbox);
    nextSocket.on(CLIENT_PROFILE_CHANGED_EVENT, onProfile);

    if (nextSocket.connected) onConnect();

    return () => {
      nextSocket.off("connect", onConnect);
      nextSocket.off("disconnect", onDisconnect);
      nextSocket.off(STAFF_INBOX_CHANGED_EVENT, onInbox);
      nextSocket.off(CLIENT_PROFILE_CHANGED_EVENT, onProfile);
      disconnectAdminRealtimeSocket();
      setSocket(null);
      setConnected(false);
    };
  }, [authToken]);

  const onStaffInboxChanged = useCallback((handler) => {
    if (typeof handler !== "function") return () => {};
    inboxListenersRef.current.add(handler);
    return () => inboxListenersRef.current.delete(handler);
  }, []);

  const registerClientProfileInvalidation = useCallback((domains, callback) => {
    if (!Array.isArray(domains) || domains.length === 0 || typeof callback !== "function") {
      return () => {};
    }
    const keys = [...new Set(domains.map((d) => String(d || "").trim()).filter(Boolean))];
    keys.forEach((domain) => {
      if (!profileListenersRef.current.has(domain)) {
        profileListenersRef.current.set(domain, new Set());
      }
      profileListenersRef.current.get(domain).add(callback);
    });
    return () => {
      keys.forEach((domain) => {
        const set = profileListenersRef.current.get(domain);
        if (set) {
          set.delete(callback);
          if (set.size === 0) profileListenersRef.current.delete(domain);
        }
      });
    };
  }, []);

  const value = useMemo(
    () => ({
      connected,
      socket,
      onStaffInboxChanged,
      registerClientProfileInvalidation,
    }),
    [connected, socket, onStaffInboxChanged, registerClientProfileInvalidation],
  );

  return (
    <AdminRealtimeContext.Provider value={value}>
      {children}
    </AdminRealtimeContext.Provider>
  );
}
