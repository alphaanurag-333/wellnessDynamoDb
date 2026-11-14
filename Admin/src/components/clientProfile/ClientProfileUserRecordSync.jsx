import { useCallback, useEffect, useRef } from "react";
import { fetchUser } from "../../api/usersApi.js";
import { isMockNumericId } from "../../utils/isMockNumericId.js";
import { personalProfileRemoteSignature } from "../../utils/clientProfileAppSync.js";
import { useClientProfileInvalidation } from "../../hooks/useClientProfileInvalidation.js";
import { useClientProfileLiveSync } from "../../hooks/useClientProfileLiveSync.js";
import { CLIENT_PROFILE_SECTION_SOCKET_DOMAINS } from "./ClientProfilePageSocketSync.jsx";

/** Personal + body so sidebar/onboarding badges refresh when the app submits measurements/photos. */
const USER_RECORD_DOMAINS = [
  ...CLIENT_PROFILE_SECTION_SOCKET_DOMAINS.personal,
  "body",
];

/**
 * Keeps parent client profile row in sync when the mobile app edits personal / glance / body fields.
 * Sidebar name, avatar, and shared `user` props refresh via socket — no full page reload.
 */
export function ClientProfileUserRecordSync({ userId, onUserRow }) {
  const inFlightRef = useRef(false);
  const remoteSigRef = useRef("");
  const onUserRowRef = useRef(onUserRow);
  onUserRowRef.current = onUserRow;

  useEffect(() => {
    remoteSigRef.current = "";
  }, [userId]);

  const syncUserRow = useCallback(async () => {
    const id = String(userId || "").trim();
    if (!id || isMockNumericId(id) || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const pull = async () => {
        const row = await fetchUser(id);
        if (!row) return false;
        const signature = personalProfileRemoteSignature(row);
        if (signature === remoteSigRef.current) return false;
        remoteSigRef.current = signature;
        onUserRowRef.current?.(row);
        return true;
      };
      // Second pull covers rare read races without setTimeout (timers throttle when unfocused).
      if (await pull()) return;
      await pull();
    } catch {
      /* socket resync is best-effort */
    } finally {
      inFlightRef.current = false;
    }
  }, [userId]);

  const onSocketInvalidate = useCallback(
    (payload) => {
      const metaName = payload?.meta?.name;
      if (metaName != null && String(metaName).trim()) {
        onUserRowRef.current?.({ name: String(metaName).trim() });
      }
      void syncUserRow();
    },
    [syncUserRow],
  );

  const enabled = Boolean(userId) && !isMockNumericId(userId);
  useClientProfileInvalidation(USER_RECORD_DOMAINS, onSocketInvalidate, { enabled });
  useClientProfileLiveSync(syncUserRow, { enabled });

  return null;
}
