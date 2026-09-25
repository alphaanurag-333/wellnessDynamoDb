import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { VIEW_AS_ROLES } from "../data/dashboardData.js";
import {
  accountLogin,
  accountLoginTotp,
  accountMe,
  accountSwitchRole,
  clearAccountAuth,
  readAccountAuth,
  writeAccountAuth,
  ROLE_KEY_TO_UI,
  UI_TO_ROLE_KEY,
} from "../api/accountApi.js";
import { fetchAccessRoles } from "../api/accessApi.js";
import {
  ALL_CONSOLE_PERMISSIONS,
  baselineDataScopeForRole,
  baselinePermissionsForRole,
  defaultAdminNavSections,
  hasConsolePermission,
  resolveLiveNavSections,
  stripConfigPermissionSlugsForRole,
} from "../utils/permissions.js";
import { canPreviewLiveRole, liveRoleIdsForSession, staticViewAsMenuRoles, toViewAsMenuRole } from "../utils/liveRoles.js";
import { loadAppConfig } from "../store/loadAppConfig.js";
import { clearAdminProfile, setAdminProfile } from "../store/slices/adminProfileSlice.js";

const VIEW_AS_STORAGE_KEY = "ua-view-as";

const ViewAsContext = createContext(null);

function readStoredViewAs() {
  try {
    const stored = localStorage.getItem(VIEW_AS_STORAGE_KEY);
    if (stored) return stored;
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
 * Slugs the signed-in account's active role receives from the API.
 * Super Admin is only treated as all-powerful while viewing the Admin console
 * (see isAdminView). Member overrides from Access Control live on account.permissions.
 */
function sessionPermissions(account) {
  if (!account) return [];
  const activeKey = account.activeRole || account.defaultRoleKey;
  const activeUi = ROLE_KEY_TO_UI[activeKey] || account.activeRoleUi;
  if (activeKey === "admin" || activeUi === "admin") return [...ALL_CONSOLE_PERMISSIONS];
  const granted = Array.isArray(account.permissions) ? account.permissions : [];
  const list = granted.some((slug) => String(slug).startsWith("console."))
    ? granted
    : baselinePermissionsForRole(activeUi || "wc");
  return stripConfigPermissionSlugsForRole(list, activeUi || "wc");
}

export function ViewAsProvider({ children }) {
  const dispatch = useDispatch();
  const [auth, setAuth] = useState(() => readAccountAuth());
  const [viewAs, setViewAsState] = useState(() => uiFromAccount(readAccountAuth()?.account));
  const [bootstrapping, setBootstrapping] = useState(Boolean(readAccountAuth()?.accessToken));
  const [authError, setAuthError] = useState("");
  const [liveMenuRoles, setLiveMenuRoles] = useState(() => staticViewAsMenuRoles());
  const [accessRoles, setAccessRoles] = useState([]);
  const [liveRolesReady, setLiveRolesReady] = useState(false);

  const reloadLiveRoles = useCallback(async () => {
    if (!readAccountAuth()?.accessToken) {
      setLiveMenuRoles(staticViewAsMenuRoles());
      setAccessRoles([]);
      setLiveRolesReady(true);
      return [];
    }
    try {
      const roles = await fetchAccessRoles();
      const list = Array.isArray(roles) ? roles : [];
      setAccessRoles(list);
      const mapped = list.map(toViewAsMenuRole);
      setLiveMenuRoles(mapped.length ? mapped : staticViewAsMenuRoles());
      return mapped;
    } catch {
      setAccessRoles([]);
      setLiveMenuRoles(staticViewAsMenuRoles());
      return [];
    } finally {
      setLiveRolesReady(true);
    }
  }, []);

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
        const nextView = uiFromAccount(account);
        setViewAsState(nextView);
        try {
          localStorage.setItem(VIEW_AS_STORAGE_KEY, nextView);
        } catch {
          /* ignore */
        }
        if (account) dispatch(setAdminProfile(account));
        loadAppConfig();
        await reloadLiveRoles();
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
  }, [dispatch, reloadLiveRoles]);

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
      const result = await accountLogin({ email, password, activeRole });
      if (result?.mfaRequired) {
        return result;
      }
      setAuth(result);
      setViewAsLocal(uiFromAccount(result.account));
      if (result?.account) dispatch(setAdminProfile(result.account));
      loadAppConfig();
      await reloadLiveRoles();
      return result;
    },
    [dispatch, reloadLiveRoles, setViewAsLocal],
  );

  const completeTotpLogin = useCallback(
    async ({ mfaToken, code }) => {
      setAuthError("");
      const stored = await accountLoginTotp({ mfaToken, code });
      setAuth(stored);
      setViewAsLocal(uiFromAccount(stored.account));
      if (stored?.account) dispatch(setAdminProfile(stored.account));
      loadAppConfig();
      await reloadLiveRoles();
      return stored;
    },
    [dispatch, reloadLiveRoles, setViewAsLocal],
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

  useEffect(() => {
    if (!auth?.accessToken) return undefined;
    const syncPermissions = () => {
      refreshAccount().catch(() => {});
    };
    window.addEventListener("focus", syncPermissions);
    return () => window.removeEventListener("focus", syncPermissions);
  }, [auth?.accessToken, refreshAccount]);

  const isSuperAdmin = accountIsSuperAdmin(auth?.account);

  const setViewAs = useCallback(
    async (roleId) => {
      const roleMeta = liveMenuRoles.find((r) => r.id === roleId)
        || staticViewAsMenuRoles().find((r) => r.id === roleId);
      const canPreview = accountIsAdminRole(auth?.account);
      const activeUi = auth?.account
        ? ROLE_KEY_TO_UI[auth.account.activeRole] || auth.account.activeRoleUi || null
        : null;
      const previewHierarchy = canPreviewLiveRole(activeUi, roleId);

      if (roleMeta && roleMeta.switchable === false && !canPreview && !previewHierarchy) {
        setViewAsLocal(roleId);
        return { redirectedToAccess: true };
      }

      if (!auth?.accessToken) {
        setViewAsLocal(roleId);
        return { localOnly: true };
      }

      // Admin and WC/AWC preview personas without switching JWT — keeps their APIs available.
      if (
        accountIsSuperAdmin(auth.account)
        || (canPreview && activeUi === "admin")
        || previewHierarchy
      ) {
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
    [auth, dispatch, liveMenuRoles, setViewAsLocal],
  );

  const sessionUi = auth?.account
    ? ROLE_KEY_TO_UI[auth.account.activeRole] || auth.account.activeRoleUi || null
    : null;

  const catalogRoles = useMemo(() => {
    const staticRoles = staticViewAsMenuRoles();
    if (!liveMenuRoles.length) return staticRoles;
    // /account/access/roles is scoped for WC/AWC (descendants only). Keep
    // system personas so a signed-in WC is not treated as an unknown role.
    const byId = new Map(staticRoles.map((role) => [role.id, role]));
    for (const role of liveMenuRoles) byId.set(role.id, role);
    return [...byId.values()];
  }, [liveMenuRoles]);

  const availableUiRoles = useMemo(() => {
    if (isSuperAdmin || sessionUi === "admin") return catalogRoles;
    const allowed = liveRoleIdsForSession(sessionUi, auth?.account?.roles);
    if (!allowed.size) return catalogRoles;
    return catalogRoles.filter((role) => allowed.has(role.id));
  }, [auth, catalogRoles, isSuperAdmin, sessionUi]);

  const activeRole = useMemo(
    () =>
      availableUiRoles.find((role) => role.id === viewAs) ||
      catalogRoles.find((role) => role.id === viewAs) ||
      availableUiRoles.find((role) => role.id === sessionUi) ||
      catalogRoles.find((role) => role.id === sessionUi) ||
      catalogRoles[0] ||
      VIEW_AS_ROLES[0],
    [availableUiRoles, catalogRoles, sessionUi, viewAs],
  );

  useEffect(() => {
    if (!liveRolesReady || !catalogRoles.length) return;
    const known = catalogRoles.some((role) => role.id === viewAs);
    if (known) return;
    setViewAsLocal(sessionUi || "admin");
  }, [catalogRoles, liveRolesReady, sessionUi, setViewAsLocal, viewAs]);

  // Non-admin staff must never stay on a stale ua-view-as=admin from a prior session.
  useEffect(() => {
    if (!sessionUi || sessionUi === "admin") return;
    if (isSuperAdmin) return;
    if (viewAs === "admin") setViewAsLocal(sessionUi);
  }, [isSuperAdmin, sessionUi, setViewAsLocal, viewAs]);

  /** Admin (or Super Admin) previewing another role via View-as — not the signed-in JWT role. */
  const isPreviewingRole = Boolean(sessionUi && viewAs && sessionUi !== viewAs);

  /** Signed-in Admin (or Super Admin) looking at the Admin console — full section access. */
  const isAdminView = viewAs === "admin" && (isSuperAdmin || sessionUi === "admin");
  const hasFullAccess = isSuperAdmin && viewAs === "admin";
  const canPreviewRoles = accountIsAdminRole(auth?.account);

  /**
   * Live grants for the console. Admin view always gets every catalog slug.
   * Signed-in staff use API-resolved permissions (includes member overrides).
   * Super Admin previewing another persona uses that role's Access Control template.
   */
  const permissions = useMemo(() => {
    if (isAdminView) return [...ALL_CONSOLE_PERMISSIONS];
    let list;
    if (!isPreviewingRole) {
      list = sessionPermissions(auth?.account);
    } else if (Array.isArray(activeRole?.permissions) && activeRole.permissions.length) {
      list = activeRole.permissions;
    } else {
      list = baselinePermissionsForRole(activeRole?.persona || viewAs);
    }
    return stripConfigPermissionSlugsForRole(
      list,
      (isPreviewingRole ? activeRole?.id : sessionUi) || viewAs,
    );
  }, [activeRole, auth?.account, isAdminView, isPreviewingRole, sessionUi, viewAs]);

  const can = useCallback(
    (slug) => (isAdminView ? Boolean(slug) : hasConsolePermission(permissions, slug)),
    [isAdminView, permissions],
  );

  const navSections = useMemo(() => {
    if (isAdminView) return defaultAdminNavSections({ includeAccess: hasFullAccess });
    const tickList = isPreviewingRole
      ? (activeRole?.navSections || [])
      : (Array.isArray(auth?.account?.navSections) && auth.account.navSections.length
        ? auth.account.navSections
        : (activeRole?.navSections || []));
    return resolveLiveNavSections({
      permissions,
      tickList,
      roleId: activeRole?.persona || viewAs,
      includeAccess: hasFullAccess,
    });
  }, [activeRole, auth?.account?.navSections, hasFullAccess, isAdminView, isPreviewingRole, permissions, viewAs]);

  const viewAsPersona = activeRole?.persona || viewAs;

  /** "all" | "team" | "assigned" — how wide the role's client roster is. */
  const dataScope = useMemo(() => {
    if (isAdminView) return "all";
    if (isPreviewingRole) {
      return String(
        activeRole?.dataScope || baselineDataScopeForRole(activeRole?.persona || viewAs),
      ).toLowerCase();
    }
    return (
      String(auth?.account?.dataScope || "").toLowerCase()
      || baselineDataScopeForRole(sessionUi || viewAs)
    );
  }, [activeRole, auth?.account, isAdminView, isPreviewingRole, sessionUi, viewAs]);

  const value = useMemo(
    () => ({
      viewAs,
      viewAsPersona,
      sessionUi,
      setViewAs,
      activeRole,
      availableUiRoles,
      catalogRoles,
      liveMenuRoles,
      accessRoles,
      liveRolesReady,
      reloadLiveRoles,
      auth,
      account: auth?.account || null,
      token: auth?.accessToken || null,
      isAuthenticated: Boolean(auth?.accessToken),
      isSuperAdmin,
      isAdminView,
      hasFullAccess,
      permissions,
      can,
      navSections,
      dataScope,
      bootstrapping,
      authError,
      setAuthError,
      login,
      completeTotpLogin,
      logout,
      setAccount,
      UI_TO_ROLE_KEY,
    }),
    [
      viewAs,
      viewAsPersona,
      sessionUi,
      setViewAs,
      activeRole,
      availableUiRoles,
      catalogRoles,
      liveMenuRoles,
      accessRoles,
      liveRolesReady,
      reloadLiveRoles,
      auth,
      isSuperAdmin,
      isAdminView,
      hasFullAccess,
      permissions,
      can,
      navSections,
      dataScope,
      bootstrapping,
      authError,
      login,
      completeTotpLogin,
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
