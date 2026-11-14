import { useClientProfileRealtime } from "../../context/ClientProfileRealtimeContext.jsx";
import { useAdminRealtime } from "../../context/AdminRealtimeContext.jsx";

function statusMeta({ adminConnected, subscribed, subscribeError, enabled }) {
  if (!enabled) {
    return { label: "Live off", tone: "muted", title: "Realtime disabled for this profile" };
  }
  if (subscribeError) {
    return {
      label: "Live error",
      tone: "error",
      title: subscribeError,
    };
  }
  if (adminConnected && subscribed) {
    return {
      label: "Live",
      tone: "live",
      title: "Connected — profile updates sync automatically",
    };
  }
  if (adminConnected) {
    return {
      label: "Joining…",
      tone: "pending",
      title: "Socket connected; subscribing to this client…",
    };
  }
  return {
    label: "Offline",
    tone: "offline",
    title: "Realtime unavailable — refresh or check login",
  };
}

/** Shown on client profile topbar — socket connected + subscribed to this user. */
export function ClientProfileLiveStatus({ enabled = true }) {
  const { connected: profileConnected, subscribed, subscribeError } = useClientProfileRealtime();
  const { connected: adminConnected } = useAdminRealtime();
  const connected = profileConnected || adminConnected;
  const meta = statusMeta({ adminConnected: connected, subscribed, subscribeError, enabled });

  return (
    <span
      className={`ua-cp-live-status ua-cp-live-status--${meta.tone}`}
      title={meta.title}
      aria-live="polite"
    >
      <span className="ua-cp-live-status__dot" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
