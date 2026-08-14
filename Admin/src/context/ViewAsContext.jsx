import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { VIEW_AS_ROLES } from "../data/dashboardData.js";
import {
  accountLogin,
  accountMe,
  accountSwitchRole,
  clearAccountAuth,
  readAccountAuth,
  writeAccountAuth,
  ROLE_KEY_TO_UI,
  UI_TO_ROLE_KEY,
} from "../api/accountApi.js";

const VIEW_AS_STORAGE_KEY = "ua-view-as";

const ViewAsContext = createContext(null);

function readStoredViewAs() {
  try {
    const stored = localStorage.getItem(VIEW_AS_STORAGE_KEY);
    if (stored && VIEW_AS_ROLES.some((role) => role.id === stored)) return stored;
  } catch {
    /* ignore */
  }
  return "admin";
}

function uiFromAccount(account) {
  if (!account) return readStoredViewAs();
  const key = account.activeRole || account.defaultRoleKey;
  return ROLE_KEY_TO_UI[key] || readStoredViewAs();
}

function accountIsSuperAdmin(account) {
  return Boolean(account?.isSuperAdmin);
}

export function ViewAsProvider({ children }) {
  const [auth, setAuth] = useState(() => readAccountAuth());
  const [viewAs, setViewAsState] = useState(() => uiFromAccount(readAccountAuth()?.account));
  const [bootstrapping, setBootstrapping] = useState(Boolean(readAccountAuth()?.accessToken));
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!readAccountAuth()?.accessToken) {
        setBootstrapping(false);
        return;
      }
      try {
        const account = await accountMe();
        if (cancelled) return;
        setAuth(readAccountAuth());
        setViewAsState(uiFromAccount(account));
      } catch {
        if (!cancelled) {
          clearAccountAuth();
          setAuth(null);
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const setViewAsLocal = useCallback((roleId) => {
    setViewAsState(roleId);
    try {
      localStorage.setItem(VIEW_AS_STORAGE_KEY, roleId);
    } catch {
      /* ignore */
    }
  }, []);

  const login = useCallback(
    async ({ email, password, activeRole }) => {
      setAuthError("");
      const stored = await accountLogin({ email, password, activeRole });
      setAuth(stored);
      setViewAsLocal(uiFromAccount(stored.account));
      return stored;
    },
    [setViewAsLocal],
  );

  const logout = useCallback(() => {
    clearAccountAuth();
    setAuth(null);
    setAuthError("");
  }, []);

  const setAccount = useCallback((account) => {
    if (!account) return;
    setAuth((prev) => {
      if (!prev?.accessToken) return prev;
      const next = { ...prev, account };
      writeAccountAuth(next);
      return next;
    });
  }, []);

  const refreshAccount = useCallback(async () => {
    const account = await accountMe();
    if (account) {
      setAuth(readAccountAuth());
    }
    return account;
  }, []);

  const isSuperAdmin = accountIsSuperAdmin(auth?.account);

  const setViewAs = useCallback(
    async (roleId) => {
      const roleMeta = VIEW_AS_ROLES.find((r) => r.id === roleId);
      if (roleMeta && roleMeta.switchable === false) {
        setViewAsLocal(roleId);
        return { redirectedToAccess: true };
      }

      if (!auth?.accessToken) {
        setViewAsLocal(roleId);
        return { localOnly: true };
      }

      // Super Admin: UI preview only — never switch JWT away from admin,
      // otherwise Access/Teams admin APIs return Forbidden.
      if (accountIsSuperAdmin(auth.account)) {
        setViewAsLocal(roleId);
        return { previewOnly: true };
      }

      const eligible = Array.isArray(auth.account?.roles)
        ? auth.account.roles.map((k) => ROLE_KEY_TO_UI[k] || k)
        : [];

      if (eligible.length && !eligible.includes(roleId)) {
        throw new Error("You do not have this role on your account");
      }

      try {
        const stored = await accountSwitchRole(roleId);
        setAuth(stored);
        setViewAsLocal(roleId);
        return stored;
      } catch (err) {
        setViewAsLocal(roleId);
        throw err;
      }
    },
    [auth, setViewAsLocal],
  );

  const activeRole = useMemo(
    () => VIEW_AS_ROLES.find((role) => role.id === viewAs) ?? VIEW_AS_ROLES[0],
    [viewAs],
  );

  const availableUiRoles = useMemo(() => {
    if (isSuperAdmin) return VIEW_AS_ROLES;
    const roles = auth?.account?.roles;
    if (!Array.isArray(roles) || roles.length === 0) return VIEW_AS_ROLES;
    const allowed = new Set(roles.map((k) => ROLE_KEY_TO_UI[k] || k));
    return VIEW_AS_ROLES.filter((r) => allowed.has(r.id) || r.switchable === false);
  }, [auth, isSuperAdmin]);

  const hasFullAccess = isSuperAdmin && viewAs === "admin";

  const value = useMemo(
    () => ({
      viewAs,
      setViewAs,
      activeRole,
      availableUiRoles,
      auth,
      account: auth?.account || null,
      token: auth?.accessToken || null,
      isAuthenticated: Boolean(auth?.accessToken),
      isSuperAdmin,
      hasFullAccess,
      bootstrapping,
      authError,
      setAuthError,
      login,
      logout,
      setAccount,
      refreshAccount,
      UI_TO_ROLE_KEY,
    }),
    [
      viewAs,
      setViewAs,
      activeRole,
      availableUiRoles,
      auth,
      isSuperAdmin,
      hasFullAccess,
      bootstrapping,
      authError,
      login,
      logout,
      setAccount,
      refreshAccount,
    ],
  );

  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>;
}

export function useViewAs() {
  const ctx = useContext(ViewAsContext);
  if (!ctx) throw new Error("useViewAs must be used within ViewAsProvider");
  return ctx;
}
