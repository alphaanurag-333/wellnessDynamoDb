import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
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
import {
  ALL_CONSOLE_PERMISSIONS,
  baselineDataScopeForRole,
  baselinePermissionsForRole,
  defaultAdminNavSections,
  hasConsolePermission,
  sectionsFromPermissions,
} from "../utils/permissions.js";
import { loadAppConfig } from "../store/loadAppConfig.js";
import { clearAdminProfile, setAdminProfile } from "../store/slices/adminProfileSlice.js";

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

function accountIsAdminRole(account) {
  if (!account) return false;
  if (accountIsSuperAdmin(account)) return true;
  const key = account.activeRole || account.defaultRoleKey;
  return key === "admin" || ROLE_KEY_TO_UI[key] === "admin" || account.activeRoleUi === "admin";
}

/**
 * Slugs the current session may actually use.
 * Admin always receives the full catalog — WC / AWC section grants must not
 * leak into an admin session. Other roles whose template predates the console
 * catalog fall back to the role baseline, matching the API.
 */
function sessionPermissions(account) {
  if (!account) return [];
  if (accountIsAdminRole(account)) return [...ALL_CONSOLE_PERMISSIONS];
  const granted = Array.isArray(account.permissions) ? account.permissions : [];
  if (granted.some((slug) => String(slug).startsWith("console."))) return granted;
  return baselinePermissionsForRole(ROLE_KEY_TO_UI[account.activeRole] || account.activeRoleUi);
}

export function ViewAsProvider({ children }) {
  const dispatch = useDispatch();
  const [auth, setAuth] = useState(() => readAccountAuth());
  const [viewAs, setViewAsState] = useState(() => uiFromAccount(readAccountAuth()?.account));
  const [bootstrapping, setBootstrapping] = useState(Boolean(readAccountAuth()?.accessToken));
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!readAccountAuth()?.accessToken) {
        setBootstrapping(false);
        loadAppConfig({ publicOnly: true });
        return;
      }
      try {
        const account = await accountMe();
        if (cancelled) return;
        setAuth(readAccountAuth());
        setViewAsState(uiFromAccount(account));
        if (account) dispatch(setAdminProfile(account));
        loadAppConfig();
      } catch {
        if (!cancelled) {
          clearAccountAuth();
          setAuth(null);
          dispatch(clearAdminProfile());
          loadAppConfig({ publicOnly: true });
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

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
      if (stored?.account) dispatch(setAdminProfile(stored.account));
      loadAppConfig();
      return stored;
    },
    [dispatch, setViewAsLocal],
  );

  const logout = useCallback(() => {
    clearAccountAuth();
    setAuth(null);
    setAuthError("");
    dispatch(clearAdminProfile());
  }, [dispatch]);

  const setAccount = useCallback((account) => {
    if (!account) return;
    dispatch(setAdminProfile(account));
    setAuth((prev) => {
      if (!prev?.accessToken) return prev;
      const next = { ...prev, account };
      writeAccountAuth(next);
      return next;
    });
  }, [dispatch]);

  const refreshAccount = useCallback(async () => {
    const account = await accountMe();
    if (account) {
      setAuth(readAccountAuth());
      dispatch(setAdminProfile(account));
    }
    return account;
  }, [dispatch]);

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
        if (stored?.account) dispatch(setAdminProfile(stored.account));
        return stored;
      } catch (err) {
        setViewAsLocal(roleId);
        throw err;
      }
    },
    [auth, dispatch, setViewAsLocal],
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

  const sessionUi = auth?.account
    ? ROLE_KEY_TO_UI[auth.account.activeRole] || auth.account.activeRoleUi
    : null;

  /** Signed-in Admin (or Super Admin) looking at the Admin console — full section access. */
  const isAdminView = viewAs === "admin" && (isSuperAdmin || sessionUi === "admin");
  const hasFullAccess = isSuperAdmin && viewAs === "admin";

  /**
   * Live grants for the console. Admin always gets every catalog slug.
   * While a Super Admin previews another role the session is narrowed to that
   * role's baseline so the preview never shows more than WC / AWC can do.
   */
  const permissions = useMemo(() => {
    if (isAdminView) return [...ALL_CONSOLE_PERMISSIONS];
    const granted = sessionPermissions(auth?.account);
    if (!sessionUi || sessionUi === viewAs) return granted;
    const preview = new Set(baselinePermissionsForRole(viewAs));
    return granted.filter((slug) => preview.has(slug));
  }, [auth, isAdminView, sessionUi, viewAs]);

  const can = useCallback(
    (slug) => (isAdminView ? Boolean(slug) : hasConsolePermission(permissions, slug)),
    [isAdminView, permissions],
  );

  const navSections = useMemo(() => {
    if (isAdminView) return defaultAdminNavSections({ includeAccess: hasFullAccess });
    const sections = sectionsFromPermissions(permissions);
    if (hasFullAccess) sections.add("access");
    return sections;
  }, [permissions, hasFullAccess, isAdminView]);

  /** "all" | "team" | "assigned" — how wide the role's client roster is. */
  const dataScope = isAdminView
    ? "all"
    : String(auth?.account?.dataScope || "").toLowerCase() || baselineDataScopeForRole(sessionUi);

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
      permissions,
      can,
      navSections,
      dataScope,
      bootstrapping,
      authError,
      setAuthError,
      login,
      logout,
      setAccount,
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
      permissions,
      can,
      navSections,
      dataScope,
      bootstrapping,
      authError,
      login,
      logout,
      setAccount,
    ],
  );

  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>;
}

export function useViewAs() {
  const ctx = useContext(ViewAsContext);
  if (!ctx) throw new Error("useViewAs must be used within ViewAsProvider");
  return ctx;
}
