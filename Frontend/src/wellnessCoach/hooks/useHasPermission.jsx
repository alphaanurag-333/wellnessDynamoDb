import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { coachGetPermissions } from "../api/coachAuth.js";
import { logoutCoach } from "../../store/authSlice.js";
import {
  allTruePermissionMap,
  hasCoachPermission,
  navPermissionKey,
  permissionKeyForClientTab,
} from "../data/coachPermissionKeys.js";

const CoachPermissionsContext = createContext({
  permissions: allTruePermissionMap(),
  loading: true,
  roleId: null,
  hasPermission: () => true,
  refresh: async () => {},
});

export function CoachPermissionsProvider({ children }) {
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);
  const [permissions, setPermissions] = useState(allTruePermissionMap());
  const [roleId, setRoleId] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!coachToken) {
      setPermissions(allTruePermissionMap());
      setRoleId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await coachGetPermissions(coachToken);
      setPermissions(data?.permissions || allTruePermissionMap());
      setRoleId(data?.roleId ?? null);
    } catch (e) {
      if (e?.status === 401) {
        dispatch(logoutCoach());
        return;
      }
      // Fail open for authenticated coaches so UI still renders; API remains the real gate.
      setPermissions(allTruePermissionMap());
      setRoleId(null);
    } finally {
      setLoading(false);
    }
  }, [coachToken, dispatch]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasPermission = useCallback(
    (key) => hasCoachPermission(permissions, key),
    [permissions]
  );

  const value = useMemo(
    () => ({
      permissions,
      loading,
      roleId,
      hasPermission,
      refresh,
      navKey: navPermissionKey,
      clientTabKey: permissionKeyForClientTab,
    }),
    [permissions, loading, roleId, hasPermission, refresh]
  );

  return (
    <CoachPermissionsContext.Provider value={value}>{children}</CoachPermissionsContext.Provider>
  );
}

export function useCoachPermissions() {
  return useContext(CoachPermissionsContext);
}

/** `useHasPermission("nav.dashboard")` or any coach catalog key. */
export function useHasPermission(key) {
  const { hasPermission, loading } = useCoachPermissions();
  if (loading && !key) return false;
  return hasPermission(key);
}
