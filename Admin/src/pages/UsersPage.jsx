import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { ExportIcon } from "../components/NavIcons.jsx";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { CfgSelect, OrangeButton, PageHeader, PillTabs, ScopeChip, TableScroll } from "../components/shared.jsx";
import {
  TIER_OPTIONS,
  UNASSIGNED_COACH,
  USER_TYPE_TAB_DEFS,
  avatarColor,
  enrichUser,
  canUndoTierMove,
  conversionPrompt,
  lastActiveMinutes,
  listTierMoveOptions,
  nextTier,
  normalizeTier,
  prevTier,
  tierLabel,
  tierStyle,
  userInitials,
  userOverrideKey,
} from "../data/usersData.js";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import {
  assignUserCoach,
  deleteUser,
  fetchArchivedUsers,
  fetchScopedUsers,
  fetchUser,
  fetchUsers,
  mapUiStatusToApi,
  mapUiTierToApi,
  moveMaintenanceUserToHeal,
  moveUserToHeal,
  moveUserToMaintenance,
  moveUserToSeek,
  reassignUserCoach,
  updateUserStatus,
} from "../api/usersApi.js";
import { fetchTeamMembers } from "../api/teamsApi.js";
import { useViewAs } from "../context/ViewAsContext.jsx";

const CreateUserModal = lazy(() =>
  import("../components/CreateUserModal.jsx").then((mod) => ({ default: mod.CreateUserModal })),
);

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All status" },
  { value: "Active", label: "Active" },
  { value: "Disabled", label: "Disabled" },
];

const EMPTY_TAB_COUNTS = { all: 0, individual: 0, team: 0, app: 0, archived: 0 };
const USER_NAME_MAX_CHARS = 40;

function truncateUserName(name, max = USER_NAME_MAX_CHARS) {
  const text = String(name || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function UserListAvatar({ name, profileImage, colorIndex }) {
  const [broken, setBroken] = useState(false);
  const showPhoto = Boolean(profileImage) && !broken;
  return (
    <span
      className={`ua-avatar${showPhoto ? " ua-avatar--photo" : ""}`}
      style={showPhoto ? undefined : { background: avatarColor(colorIndex) }}
      aria-hidden={showPhoto ? undefined : true}
    >
      {showPhoto ? (
        <img src={profileImage} alt="" onError={() => setBroken(true)} />
      ) : (
        userInitials(name)
      )}
    </span>
  );
}

function extraQueryForTypeTab(tabId, baseUserTier) {
  if (tabId === "app") {
    return {
      userTier: baseUserTier || "maintenance",
      excludeClientCategory: "eagle",
    };
  }
  if (tabId === "team") return { clientCategory: "eagle" };
  if (tabId === "individual") {
    return {
      clientCategory: "individual",
      excludeUserTier: "maintenance",
    };
  }
  return {};
}

function resolveWcId(user) {
  if (user?.parentCoachId) return String(user.parentCoachId);
  if (user?.assignedCoachType === "wellness_coach" && user?.assignedCoachId) {
    return String(user.assignedCoachId);
  }
  return "";
}

function resolveAwcId(user) {
  if (user?.assignedCoachType === "assistant_wellness_coach" && user?.assignedCoachId) {
    return String(user.assignedCoachId);
  }
  return "";
}

function SortButton({ label, active, direction, onClick }) {
  const caret = active ? (direction === "desc" ? " ↓" : " ↑") : " ⇅";
  return (
    <button type="button" className={`ua-sort-btn${active ? " ua-sort-btn--active" : ""}`} title={`Sort by ${label.toLowerCase()}`} onClick={onClick}>
      {label}{caret}
    </button>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}

function DisableIcon({ off }) {
  return off ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </svg>
  );
}

function UsersEmptyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
    </svg>
  );
}

function userSubline(user) {
  return user.email || "—";
}

function deletedAtMs(iso) {
  const d = new Date(iso || "");
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

const PAGE_SIZE = 20;
const EXPORT_PAGE_SIZE = 200;

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function usersToCsv(rows) {
  const headers = [
    "#",
    "Name",
    "Email",
    "Phone",
    "Health concern",
    "Tier",
    "Wellness coach",
    "Assistant WC",
    "Last active",
    "Status",
    "Joined",
  ];
  const lines = [headers.map(csvCell).join(",")];
  rows.forEach((user, index) => {
    lines.push([
      index + 1,
      user.name,
      user.email,
      user.phone,
      user.goal,
      tierLabel(user.tier),
      user.coach || UNASSIGNED_COACH,
      user.awc || "",
      user.lastActive || "",
      user.status,
      user.joined || "",
    ].map(csvCell).join(","));
  });
  return `\uFEFF${lines.join("\r\n")}`;
}

function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportFilename() {
  const stamp = new Date().toISOString().slice(0, 10);
  return `users-${stamp}.csv`;
}

function buildPageItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((n) => items.add(n));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => items.add(n));
  return Array.from(items)
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b)
    .reduce((acc, n) => {
      if (acc.length && n - acc[acc.length - 1] > 1) acc.push("…");
      acc.push(n);
      return acc;
    }, []);
}

export function UsersPage() {
  const navigate = useNavigate();
  const { showToast: onToast } = useOutletContext();
  const { activeRole, can, dataScope, isAdminView, viewAs, viewAsPersona } = useViewAs();
  const [searchParams, setSearchParams] = useSearchParams();

  const canCreate = can("console.cl.create");
  const canEdit = can("console.cl.edit");
  const canDelete = can("console.cl.delete");
  const canExport = can("console.cl.export");
  // Direct tier conversion on this page is admin-only (API enforces the same).
  const canChangeTier = Boolean(isAdminView);
  // Disable / re-enable client accounts is admin-only (WC and other staff must not see this).
  const canDisable = Boolean(isAdminView);
  // Admin can assign WC / AWC from this list. WC, AWC, and other staff only see names.
  const canAssignCoaches =
    viewAs === "admin" && dataScope === "all" && can("console.ra.edit") && canEdit;
  const canReassignAwc = canAssignCoaches;
  const canReassignWc = canAssignCoaches;
  const showRowActions = canDisable || canDelete;
  const isReadOnly = !canEdit && !canDelete && !canCreate;
  // Roles scoped to their own roster read through the hierarchy-aware endpoint.
  // WC and AWC always use the scoped endpoint — even when an admin previews those roles.
  const SCOPED_ROLES = new Set(["wc", "awc", "trainee"]);
  const useScopedUsers = dataScope !== "all" || SCOPED_ROLES.has(viewAs) || SCOPED_ROLES.has(viewAsPersona);

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 1,
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState(null);
  const [tierOverrides, setTierOverrides] = useState({});
  const [tierUndoByKey, setTierUndoByKey] = useState({});
  const [disabledUsers, setDisabledUsers] = useState([]);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [disableTarget, setDisableTarget] = useState(null);
  const [conversionAsk, setConversionAsk] = useState(null);
  const [reassignAsk, setReassignAsk] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [selectReset, setSelectReset] = useState(0);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tabCounts, setTabCounts] = useState(EMPTY_TAB_COUNTS);

  const typeTab = searchParams.get("tab") || "all";
  const isArchivedTab = isAdminView && typeTab === "archived";
  const tierFilter = searchParams.get("tier") || "";
  const coachFilter = searchParams.get("coach") || "";
  const subscriptionExpiryParam = Number(searchParams.get("subscriptionExpiry"));
  const subscriptionExpiryDays =
    Number.isFinite(subscriptionExpiryParam) && subscriptionExpiryParam > 0
      ? Math.floor(subscriptionExpiryParam)
      : null;
  const pageParam = Number(searchParams.get("page"));
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  useEffect(() => {
    if (typeTab === "archived" && !isAdminView) {
      const next = new URLSearchParams(searchParams);
      next.delete("tab");
      next.delete("page");
      setSearchParams(next, { replace: true });
    }
  }, [isAdminView, searchParams, setSearchParams, typeTab]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (disableTarget || deleteTarget || reassignAsk || conversionAsk) {
      document.activeElement?.blur?.();
    }
  }, [disableTarget, deleteTarget, reassignAsk, conversionAsk]);

  useEffect(() => {
    if (!canReassignAwc) {
      setTeamMembers([]);
      return undefined;
    }
    let cancelled = false;
    fetchTeamMembers({ limit: 200 })
      .then((team) => {
        if (cancelled) return;
        setTeamMembers(
          Array.isArray(team?.members)
            ? team.members.filter((m) => !m.isSuperAdmin && m.primaryRoleKey !== "admin")
            : [],
        );
      })
      .catch(() => {
        if (!cancelled) setTeamMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canReassignAwc]);

  const refreshUsers = useCallback(() => {
    setReloadNonce((n) => n + 1);
  }, []);

  const baseListQuery = useMemo(() => ({
    search: debouncedSearch || undefined,
    status: mapUiStatusToApi(statusFilter),
    userTier: mapUiTierToApi(tierFilter),
    parentCoachId: coachFilter || undefined,
    subscriptionExpiryDays: subscriptionExpiryDays || undefined,
  }), [coachFilter, debouncedSearch, statusFilter, subscriptionExpiryDays, tierFilter]);

  const listQuery = useMemo(() => {
    const extra = extraQueryForTypeTab(typeTab, baseListQuery.userTier);
    return {
      ...baseListQuery,
      ...extra,
      userTier: extra.userTier || baseListQuery.userTier,
    };
  }, [baseListQuery, typeTab]);

  const loadUsersPage = useCallback(async (page, limit) => {
    if (isArchivedTab) {
      return fetchArchivedUsers({
        page,
        limit,
        search: debouncedSearch || undefined,
      });
    }
    const params = { ...listQuery, page, limit };
    return useScopedUsers
      ? fetchScopedUsers({
          page: params.page,
          limit: params.limit,
          search: params.search,
          userTier: params.userTier,
          subscriptionExpiryDays: params.subscriptionExpiryDays,
        })
      : fetchUsers(params);
  }, [debouncedSearch, isArchivedTab, listQuery, useScopedUsers]);

  useEffect(() => {
    let cancelled = false;
    async function loadUsers() {
      setLoading(true);
      setLoadError("");
      try {
        const userResult = await loadUsersPage(currentPage, PAGE_SIZE);
        if (cancelled) return;
        const rows = userResult?.users || [];
        const nextPagination = userResult?.pagination || {
          page: currentPage,
          limit: PAGE_SIZE,
          total: rows.length,
          pages: 1,
        };
        setUsers(rows);
        setPagination({
          page: Number(nextPagination.page) || currentPage,
          limit: Number(nextPagination.limit) || PAGE_SIZE,
          total: Number(nextPagination.total) || 0,
          pages: Math.max(1, Number(nextPagination.pages) || 1),
        });
      } catch (err) {
        if (cancelled) return;
        setLoadError(err?.message || "Failed to load users");
        setUsers([]);
        setPagination({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [currentPage, loadUsersPage, reloadNonce]);

  useEffect(() => {
    let cancelled = false;
    async function loadTabCounts() {
      const fetchCount = async (tabId) => {
        const extra = extraQueryForTypeTab(tabId, baseListQuery.userTier);
        const params = {
          ...baseListQuery,
          ...extra,
          userTier: extra.userTier || baseListQuery.userTier,
        };
        try {
          const result = useScopedUsers
            ? await fetchScopedUsers({
                page: 1,
                limit: 1,
                search: params.search,
                userTier: params.userTier,
                subscriptionExpiryDays: params.subscriptionExpiryDays,
              })
            : await fetchUsers({ ...params, page: 1, limit: 1 });
          return Number(result?.pagination?.total) || 0;
        } catch {
          return 0;
        }
      };
      const [individual, team, app, archived] = await Promise.all([
        fetchCount("individual"),
        fetchCount("team"),
        fetchCount("app"),
        isAdminView
          ? fetchArchivedUsers({ page: 1, limit: 1, search: baseListQuery.search })
              .then((result) => Number(result?.pagination?.total) || 0)
              .catch(() => 0)
          : Promise.resolve(0),
      ]);
      if (!cancelled) {
        setTabCounts({
          all: individual + team + app,
          individual,
          team,
          app,
          archived,
        });
      }
    }
    loadTabCounts();
    return () => {
      cancelled = true;
    };
  }, [baseListQuery, isAdminView, reloadNonce, useScopedUsers]);

  useEffect(() => {
    if (typeTab === "all" || typeTab === "archived") return;
    setTabCounts((prev) => (
      prev[typeTab] === pagination.total ? prev : { ...prev, [typeTab]: pagination.total }
    ));
  }, [pagination.total, typeTab]);

  useEffect(() => {
    if (typeTab !== "archived") return;
    setTabCounts((prev) => (
      prev.archived === pagination.total ? prev : { ...prev, archived: pagination.total }
    ));
  }, [pagination.total, typeTab]);

  const setTypeTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "all") next.delete("tab");
    else next.set("tab", tab);
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const setTierFilter = (tier) => {
    const next = new URLSearchParams(searchParams);
    if (!tier) next.delete("tier");
    else next.set("tier", tier);
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const clearCoachFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("coach");
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const clearSubscriptionExpiryFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("subscriptionExpiry");
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const setPage = (page) => {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) next.delete("page");
    else next.set("page", String(page));
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setSearchParams({}, { replace: true });
  };

  const overrideState = useMemo(
    () => ({ tierOverrides, coachOverrides: {}, awcOverrides: {}, disabledUsers }),
    [disabledUsers, tierOverrides],
  );

  const basePool = useMemo(() => {
    if (isArchivedTab) return users;
    return users.filter((u) => !deletedUsers.includes(userOverrideKey(u)));
  }, [deletedUsers, isArchivedTab, users]);

  const enrichedPool = useMemo(() => {
    if (isArchivedTab) return basePool;
    return basePool.map((u) => enrichUser(u, overrideState));
  }, [basePool, isArchivedTab, overrideState]);

  const wcSelectOptions = useMemo(() => {
    const byId = new Map();
    byId.set("", { id: "", name: UNASSIGNED_COACH });
    for (const m of teamMembers) {
      if (m.primaryRoleKey === "wc" && m.id) {
        byId.set(String(m.id), {
          id: String(m.id),
          name: String(m.name || "").trim() || "Wellness coach",
          parentAccountId: null,
        });
      }
    }
    for (const u of enrichedPool) {
      const id = resolveWcId(u);
      if (id && !byId.has(id)) {
        byId.set(id, {
          id,
          name: u.coach && u.coach !== UNASSIGNED_COACH ? u.coach : id,
          parentAccountId: null,
        });
      }
    }
    return Array.from(byId.values());
  }, [enrichedPool, teamMembers]);

  const awcSelectOptions = useMemo(() => {
    const byId = new Map();
    byId.set("", { id: "", name: UNASSIGNED_COACH });
    for (const m of teamMembers) {
      if (m.primaryRoleKey === "awc" && m.id) {
        byId.set(String(m.id), {
          id: String(m.id),
          name: String(m.name || "").trim() || "Assistant WC",
          parentAccountId: m.parentAccountId ? String(m.parentAccountId) : "",
        });
      }
    }
    for (const u of enrichedPool) {
      const id = resolveAwcId(u);
      if (id && !byId.has(id)) {
        byId.set(id, {
          id,
          name: u.awc || id,
          parentAccountId: u.parentCoachId ? String(u.parentCoachId) : "",
        });
      }
    }
    return Array.from(byId.values());
  }, [enrichedPool, teamMembers]);

  const typeTabs = useMemo(() => {
    const tabs = USER_TYPE_TAB_DEFS.map((def) => {
      const id = def.id || "all";
      const count = id === "all"
        ? (tabCounts.all || (typeTab === "all" ? pagination.total : 0))
        : (tabCounts[id] ?? 0);
      return {
        id,
        label: def.label,
        count,
      };
    });
    if (isAdminView) {
      tabs.push({
        id: "archived",
        label: "Archived",
        count: tabCounts.archived ?? (typeTab === "archived" ? pagination.total : 0),
      });
    }
    return tabs;
  }, [isAdminView, pagination.total, tabCounts, typeTab]);

  const pageRows = useMemo(() => {
    let list = enrichedPool;
    if (sort) {
      const dir = sort.dir === "desc" ? -1 : 1;
      list = [...list].sort((a, b) => {
        if (sort.key === "name") {
          return dir * String(a.name || "").localeCompare(String(b.name || ""));
        }
        if (sort.key === "archived") {
          return dir * (deletedAtMs(a.deletedAt) - deletedAtMs(b.deletedAt));
        }
        return dir * (lastActiveMinutes(a.lastActive) - lastActiveMinutes(b.lastActive));
      });
    }
    return list;
  }, [enrichedPool, sort]);

  const listTotal = pagination.total;
  const headerCount = isArchivedTab
    ? listTotal
    : (Number(tabCounts[typeTab]) || listTotal);
  const totalPages = Math.max(1, pagination.pages || 1);
  const safePage = currentPage;

  useEffect(() => {
    if (loading || loadError) return;
    if (currentPage > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, loading, loadError, totalPages]);

  const rows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return pageRows.map((u, i) => ({
      ...u,
      n: start + i + 1,
    }));
  }, [pageRows, safePage]);

  const pageItems = useMemo(
    () => buildPageItems(safePage, totalPages),
    [safePage, totalPages],
  );

  const rangeStart = listTotal === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = listTotal === 0 ? 0 : rangeStart + pageRows.length - 1;

  const goToFirstPage = () => {
    if (currentPage > 1) setPage(1);
  };

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    onToast("Exporting CSV…");
    try {
      const first = await loadUsersPage(1, EXPORT_PAGE_SIZE);
      const collected = [...(first?.users || [])];
      const pages = Math.max(1, Number(first?.pagination?.pages) || 1);
      for (let page = 2; page <= pages; page += 1) {
        const next = await loadUsersPage(page, EXPORT_PAGE_SIZE);
        collected.push(...(next?.users || []));
      }

      const exportRows = collected
        .filter((u) => !deletedUsers.includes(userOverrideKey(u)))
        .map((u) => enrichUser(u, overrideState));

      if (sort) {
        const dir = sort.dir === "desc" ? -1 : 1;
        exportRows.sort((a, b) => (
          sort.key === "name"
            ? dir * String(a.name || "").localeCompare(String(b.name || ""))
            : dir * (lastActiveMinutes(a.lastActive) - lastActiveMinutes(b.lastActive))
        ));
      }

      if (!exportRows.length) {
        onToast("No users to export");
        return;
      }

      downloadCsv(exportFilename(), usersToCsv(exportRows));
      onToast(`Exported ${exportRows.length} user${exportRows.length === 1 ? "" : "s"}`);
    } catch (err) {
      onToast(err?.message || "Could not export CSV");
    } finally {
      setExporting(false);
    }
  };

  const toggleSort = (key) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const convertTier = (user) => {
    if (!canChangeTier) return;
    setConversionAsk({ user, direction: "up", ...conversionPrompt(user, "up") });
  };

  const downgradeTier = (user) => {
    if (!canChangeTier) return;
    setConversionAsk({ user, direction: "down", ...conversionPrompt(user, "down") });
  };

  const confirmConversion = async () => {
    const ask = conversionAsk;
    if (!canChangeTier || !ask?.user) return;
    const user = ask.user;
    const key = userOverrideKey(user);
    const fromTier = user.tier;
    const toTier = ask.direction === "up" ? nextTier(fromTier) : prevTier(fromTier);
    setActionBusy(true);
    try {
      let updated;
      if (ask.direction === "up") {
        updated = user.tier === "Seek to Heal"
          ? await moveUserToMaintenance(key)
          : await moveUserToHeal(key);
      } else if (user.tier === "Maintenance") {
        updated = await moveMaintenanceUserToHeal(key);
      } else {
        updated = await moveUserToSeek(key);
      }
      try {
        const fresh = await fetchUser(key);
        if (fresh) updated = { ...updated, ...fresh };
      } catch {
        // Conversion already succeeded; keep the payload if status refresh fails.
      }
      setUsers((prev) => prev.map((row) => (
        userOverrideKey(row) === key ? { ...row, ...updated } : row
      )));
      setTierUndoByKey((prev) => {
        const next = { ...prev };
        if (canUndoTierMove(fromTier, toTier)) {
          next[key] = { fromTier, toTier };
        } else {
          delete next[key];
        }
        return next;
      });
      onToast(ask.direction === "up"
        ? `${user.name} converted to ${tierLabel(nextTier(user.tier))}`
        : `${user.name} moved to ${tierLabel(prevTier(user.tier))}`);
      setConversionAsk(null);
    } catch (err) {
      onToast(err?.message || "Could not convert this client");
    } finally {
      setActionBusy(false);
    }
  };

  const undoTier = async (user) => {
    if (!canChangeTier) return;
    const key = userOverrideKey(user);
    const undo = tierUndoByKey[key];
    if (!undo || !canUndoTierMove(undo.fromTier, undo.toTier)) return;
    if (normalizeTier(user.tier) !== normalizeTier(undo.toTier)) {
      setTierUndoByKey((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    setActionBusy(true);
    try {
      let updated;
      if (normalizeTier(undo.fromTier) === "Seek to Heal" && normalizeTier(undo.toTier) === "Maintenance") {
        updated = await moveMaintenanceUserToHeal(key);
      } else {
        updated = await moveUserToMaintenance(key);
      }
      try {
        const fresh = await fetchUser(key);
        if (fresh) updated = { ...updated, ...fresh };
      } catch {
        // Undo already succeeded; keep the payload if status refresh fails.
      }
      setUsers((prev) => prev.map((row) => (
        userOverrideKey(row) === key ? { ...row, ...updated } : row
      )));
      setTierUndoByKey((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      onToast(`${user.name} restored to ${tierLabel(undo.fromTier)}`);
    } catch (err) {
      onToast(err?.message || "Could not undo this conversion");
    } finally {
      setActionBusy(false);
    }
  };

  const askDisable = async (user) => {
    if (!canDisable) return;
    if (user.off) {
      const key = userOverrideKey(user);
      if (!key) return;
      setActionBusy(true);
      try {
        await updateUserStatus(key, "active");
        setDisabledUsers((prev) => prev.filter((n) => n !== key));
        setUsers((prev) => prev.map((u) => (
          userOverrideKey(u) === key ? { ...u, status: "Active", rawStatus: "active" } : u
        )));
        onToast(`${user.name}'s account is active again`);
      } catch (err) {
        onToast(err?.message || "Could not re-enable user");
      } finally {
        setActionBusy(false);
      }
      return;
    }
    setDisableTarget(user);
  };

  const confirmDisable = async () => {
    if (!canDisable || !disableTarget) return;
    const key = userOverrideKey(disableTarget);
    setActionBusy(true);
    try {
      await updateUserStatus(key, "inactive");
      setDisabledUsers((prev) => [...prev, key]);
      setUsers((prev) => prev.map((u) => (
        userOverrideKey(u) === key ? { ...u, status: "Disabled", rawStatus: "inactive" } : u
      )));
      onToast(`${disableTarget.name} disabled`);
      setDisableTarget(null);
    } catch (err) {
      onToast(err?.message || "Could not disable user");
    } finally {
      setActionBusy(false);
    }
  };

  const openUser = (user) => {
    const id = userOverrideKey(user);
    if (id) navigate(UPDATED_ADMIN_PATHS.userDetail(id));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const key = userOverrideKey(deleteTarget);
    setActionBusy(true);
    try {
      await deleteUser(key);
      setDeletedUsers((prev) => [...prev, key]);
      setDeleteTarget(null);
      onToast(`${deleteTarget.name} archived`);
      refreshUsers();
    } catch (err) {
      onToast(err?.message || "Could not delete user");
    } finally {
      setActionBusy(false);
    }
  };

  const askReassign = (user, kind, toId) => {
    const normalizedTo = String(toId || "").trim();
    const fromId = kind === "wc" ? resolveWcId(user) : resolveAwcId(user);
    if (normalizedTo === fromId) return;

    if (!normalizedTo) {
      setSelectReset((n) => n + 1);
      onToast("Clearing coach assignment isn’t available from this list");
      return;
    }

    const options = kind === "wc" ? wcSelectOptions : awcSelectOptions;
    const member = options.find((o) => o.id === normalizedTo);
    const toName = member?.name || "Selected coach";
    const fromName = kind === "wc"
      ? (user.coach === UNASSIGNED_COACH ? "" : (user.coach || ""))
      : (user.awc || "");
    const parentCoachId = kind === "wc"
      ? normalizedTo
      : (member?.parentAccountId || user.parentCoachId || "");

    if (kind === "awc" && !parentCoachId) {
      setSelectReset((n) => n + 1);
      onToast("This assistant has no parent wellness coach");
      return;
    }

    setReassignAsk({
      user,
      kind,
      from: fromName,
      to: toName,
      toId: normalizedTo,
      parentCoachId,
    });
  };

  const confirmReassign = async () => {
    if (!reassignAsk) return;
    const { user, kind, to, toId, parentCoachId } = reassignAsk;
    const key = userOverrideKey(user);
    if (!key || !toId) return;

    const isWc = kind === "wc";
    const payload = isWc
      ? {
          assignedCoachId: toId,
          assignedCoachType: "wellness_coach",
          parentCoachId: toId,
        }
      : {
          assignedCoachId: toId,
          assignedCoachType: "assistant_wellness_coach",
          parentCoachId,
        };

    setActionBusy(true);
    try {
      const isPending = String(user.assignmentStatus || "").toLowerCase() === "pending_admin";
      const hasAssignment = Boolean(user.assignedCoachId || user.parentCoachId);
      let updated;
      if (isPending || !hasAssignment) {
        try {
          updated = await assignUserCoach(key, payload);
        } catch (assignErr) {
          const msg = String(assignErr?.message || "");
          if (/pending admin assignment|use reassign/i.test(msg)) {
            updated = await reassignUserCoach(key, payload);
          } else {
            throw assignErr;
          }
        }
      } else {
        updated = await reassignUserCoach(key, payload);
      }
      setUsers((prev) => prev.map((u) => (userOverrideKey(u) === key ? { ...u, ...updated } : u)));
      onToast(`${to} assigned as ${isWc ? "WC" : "AWC"} for ${user.name}`);
      setReassignAsk(null);
    } catch (err) {
      setSelectReset((n) => n + 1);
      onToast(err?.message || "Could not assign coach");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <main className="content ua-page-enter ua-users-page">
      <div className="ua-users-top">
        <PageHeader
          title="User Management"
          layout="split"
          meta={(
            <>
              <span className="page-head__count">{loading ? "…" : headerCount}</span>&nbsp;
              {isArchivedTab ? "archived · " : "clients · "}
              {useScopedUsers ? <span>Your assigned clients</span> : <ScopeChip />}
            </>
          )}
          actions={(
            <div className="ua-users-toolbar">
              <div className="ua-search-wrap ua-search-wrap--wide">
                <svg className="ua-search-wrap__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                <input
                  className="ua-search-wrap__input"
                  placeholder="Search name, email, phone, WhatsApp"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    goToFirstPage();
                  }}
                />
              </div>
              <CfgSelect
                className="ua-users-filter"
                ariaLabel="Filter by tier"
                value={tierFilter}
                options={TIER_OPTIONS}
                onChange={setTierFilter}
                disabled={isArchivedTab}
              />
              <CfgSelect
                className="ua-users-filter"
                ariaLabel="Filter by status"
                value={statusFilter}
                options={STATUS_FILTER_OPTIONS}
                onChange={(value) => {
                  setStatusFilter(value);
                  goToFirstPage();
                }}
                disabled={isArchivedTab}
              />
              {canExport ? (
                <button
                  type="button"
                  className="btn btn--outline ua-users-export"
                  onClick={exportCsv}
                  disabled={exporting || loading || isArchivedTab}
                >
                  <ExportIcon /> {exporting ? "Exporting…" : "Export CSV"}
                </button>
              ) : null}
              <div className="ua-users-toolbar__cta">
                {canCreate ? (
                  <OrangeButton onClick={() => setCreateOpen(true)}>+ Add user</OrangeButton>
                ) : null}
              </div>
            </div>
          )}
        />

        {coachFilter ? (
          <div className="ua-coach-filter">
            <span className="ua-coach-filter__label">
              Coach: {teamMembers.find((m) => String(m.id) === String(coachFilter))?.name || coachFilter}
            </span>
            <button type="button" className="ua-coach-filter__clear" title="Clear coach filter" onClick={clearCoachFilter}>×</button>
          </div>
        ) : null}

        {subscriptionExpiryDays ? (
          <div className="ua-coach-filter">
            <span className="ua-coach-filter__label">
              Subscription expiring in {subscriptionExpiryDays} days
            </span>
            <button
              type="button"
              className="ua-coach-filter__clear"
              title="Clear subscription expiry filter"
              onClick={clearSubscriptionExpiryFilter}
            >
              ×
            </button>
          </div>
        ) : null}

        <div className="ua-users-type-tabs">
          <PillTabs tabs={typeTabs} active={typeTab} onChange={setTypeTab} size="lg" />
        </div>
      </div>

      {isReadOnly ? (
        <div className="ua-users-readonly" role="note">
          <span className="ua-users-readonly__icon" aria-hidden="true">⊙</span>
          <span>
            Read-only view — the <strong>{activeRole?.name || "staff"}</strong> role can view these
            records but cannot edit, add, or delete.
          </span>
        </div>
      ) : null}

      {loadError ? (
        <div className="ua-users-empty" style={{ marginBottom: 16 }}>
          <div className="ua-users-empty__title">Couldn’t load clients</div>
          <p className="ua-users-empty__sub">{loadError}</p>
          <button type="button" className="btn btn--outline" onClick={refreshUsers}>Retry</button>
        </div>
      ) : null}

      <TableScroll>
        <div className={`ua-table-card ua-table-card--users${isArchivedTab ? " ua-table-card--users-archived" : ""}`}>
          <div className={`ua-table ua-table--users${isArchivedTab ? " ua-table--users-archived" : ""}${showRowActions && !isArchivedTab ? "" : " ua-table--users-readonly"} ua-table__head`}>
            <div>#</div>
            <div>
              <SortButton
                label="User Name"
                active={sort?.key === "name"}
                direction={sort?.dir}
                onClick={() => toggleSort("name")}
              />
            </div>
            {isArchivedTab ? (
              <>
                <div>Phone</div>
                <div className="ua-users-tier-head">Tier</div>
                <div>
                  <SortButton
                    label="Last active"
                    active={sort?.key === "active"}
                    direction={sort?.dir}
                    onClick={() => toggleSort("active")}
                  />
                </div>
                <div>
                  <SortButton
                    label="Archived"
                    active={sort?.key === "archived"}
                    direction={sort?.dir}
                    onClick={() => toggleSort("archived")}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="ua-users-tier-head">Tier</div>
                <div>Wellness coach</div>
                <div>Assistant WC</div>
                <div>
                  <SortButton
                    label="Last active"
                    active={sort?.key === "active"}
                    direction={sort?.dir}
                    onClick={() => toggleSort("active")}
                  />
                </div>
                <div>Status</div>
                {showRowActions ? <div className="ua-users-row-actions" aria-hidden="true" /> : null}
              </>
            )}
          </div>

          {loading ? (
            <BrandLoader variant="page" label={isArchivedTab ? "Loading archived users…" : "Loading clients…"} />
          ) : rows.length === 0 ? (
            <div className="ua-users-empty">
              <div className="ua-users-empty__icon"><UsersEmptyIcon /></div>
              <div className="ua-users-empty__title">{isArchivedTab ? "No archived clients" : "No clients found"}</div>
              <p className="ua-users-empty__sub">
                {isArchivedTab
                  ? "Deleted clients appear here with their archive date."
                  : "No records match your filters. Try clearing the search or filters."}
              </p>
              {!isArchivedTab ? (
                <button type="button" className="btn btn--outline" onClick={clearFilters}>Clear filters</button>
              ) : null}
            </div>
          ) : isArchivedTab ? (
            rows.map((u, i) => {
              const tier = tierStyle(u.tier);
              const rowKey = userOverrideKey(u) || u.name;
              return (
                <div
                  key={rowKey}
                  className="ua-table ua-table--users ua-table--users-archived ua-table--users-readonly ua-table__row ua-table__row--readonly"
                >
                  <div className="ua-table__muted ua-users-index">{u.n}</div>
                  <div className="ua-user-cell">
                    <UserListAvatar
                      name={u.name}
                      profileImage={u.profileImage}
                      colorIndex={i}
                    />
                    <div className="ua-user-cell__meta">
                      <div className="ua-user-cell__name" title={u.name || undefined}>
                        {truncateUserName(u.name)}
                      </div>
                      <div className="ua-user-cell__sub">
                        <span className="ua-user-cell__email" title={userSubline(u)}>{userSubline(u)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="ua-table__muted" data-label="Phone">{u.phone || "—"}</div>
                  <div className="ua-users-tier" data-label="Tier">
                    <span
                      className="ua-tier"
                      style={{ background: tier.bg, color: tier.color, borderColor: tier.border }}
                    >
                      {tierLabel(u.tier)}
                    </span>
                  </div>
                  <div className="ua-table__muted ua-users-last-active" data-label="Last active">
                    {u.lastActive || "—"}
                  </div>
                  <div className="ua-archived-users__deleted" data-label="Archived">
                    <span title={u.deletedLabel || undefined}>{u.deletedLabel || "—"}</span>
                    {u.deletedAgo ? (
                      <span className="ua-archived-users__deleted-ago">{u.deletedAgo}</span>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            rows.map((u, i) => {
              const tier = tierStyle(u.tier);
              const tone = u.off || u.status === "Disabled" ? "red" : u.status === "Active" ? "green" : "muted";
              const tierMoves = canChangeTier ? listTierMoveOptions(u.tier, u.ageDays) : [];
              const rowKey = userOverrideKey(u) || u.name;
              const tierUndo = canChangeTier ? tierUndoByKey[userOverrideKey(u) || rowKey] : null;
              const showTierUndo = Boolean(
                tierUndo
                && normalizeTier(u.tier) === normalizeTier(tierUndo.toTier)
                && canUndoTierMove(tierUndo.fromTier, tierUndo.toTier),
              );

              return (
                <div
                  key={rowKey}
                  className={`ua-table ua-table--users${showRowActions ? "" : " ua-table--users-readonly"} ua-table__row`}
                  onClick={() => openUser(u)}
                >
                  <div className="ua-table__muted ua-users-index">{u.n}</div>
                  <div className="ua-user-cell">
                    <UserListAvatar
                      name={u.name}
                      profileImage={u.profileImage}
                      colorIndex={i}
                    />
                    <div className="ua-user-cell__meta">
                      <div className="ua-user-cell__name" title={u.name || undefined}>
                        {truncateUserName(u.name)}
                      </div>
                      <div className="ua-user-cell__sub">
                        <span className="ua-user-cell__email" title={userSubline(u)}>{userSubline(u)}</span>
                        {/* {u.goal ? (
                          <span className="ua-user-cell__concern" title={u.goal}>{u.goal}</span>
                        ) : null} */}
                      </div>
                    </div>
                  </div>
                  <div className="ua-users-tier" data-label="Tier" onClick={(e) => e.stopPropagation()}>
                    <span
                      className="ua-tier"
                      style={{ background: tier.bg, color: tier.color, borderColor: tier.border }}
                    >
                      {tierLabel(u.tier)}
                    </span>
                    {tierMoves.length ? (
                      <div className="ua-users-tier__moves">
                        {tierMoves.map((move) => (
                          <button
                            key={`${rowKey}-${move.direction}-${move.target}`}
                            type="button"
                            className={`ua-tier-action ua-tier-action--${move.direction}`}
                            title={move.title}
                            disabled={actionBusy}
                            onClick={() => (move.direction === "up" ? convertTier(u) : downgradeTier(u))}
                          >
                            {move.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {showTierUndo ? (
                      <button
                        type="button"
                        className="ua-tier-action ua-tier-action--undo"
                        title={`Undo — restore ${tierLabel(tierUndo.fromTier)}`}
                        disabled={actionBusy}
                        onClick={() => undoTier(u)}
                      >
                        undo
                      </button>
                    ) : null}
                  </div>
                  <div className="ua-users-coach" data-label="Wellness coach" onClick={(e) => e.stopPropagation()}>
                    {!canReassignWc ? (
                      <span className="ua-users-coach__text">{u.coach || UNASSIGNED_COACH}</span>
                    ) : (
                      <select
                        key={`${rowKey}-wc-${resolveWcId(u)}-${selectReset}`}
                        className="ua-inline-select"
                        value={resolveWcId(u)}
                        onChange={(e) => askReassign(u, "wc", e.target.value)}
                        disabled={actionBusy}
                      >
                        {wcSelectOptions.map((o) => (
                          <option key={o.id || "unassigned"} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="ua-users-coach" data-label="Assistant WC" onClick={(e) => e.stopPropagation()}>
                    {!canReassignAwc ? (
                      <span className="ua-users-coach__text">{u.awc || "—"}</span>
                    ) : (
                      <select
                        key={`${rowKey}-awc-${resolveAwcId(u)}-${selectReset}`}
                        className="ua-inline-select"
                        value={resolveAwcId(u)}
                        onChange={(e) => askReassign(u, "awc", e.target.value)}
                        disabled={actionBusy}
                      >
                        {awcSelectOptions.map((o) => (
                          <option key={o.id || "unassigned"} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="ua-table__muted ua-users-last-active" data-label="Last active">{u.lastActive || "—"}</div>
                  <div className="ua-users-status" data-label="Status">
                    <span className={`ua-status-badge ua-status-badge--${tone}`}>
                      <span className="ua-status-badge__dot" />
                      {u.status}
                    </span>
                  </div>
                  {showRowActions ? (
                    <div className="ua-users-row-actions" data-label="Actions" onClick={(e) => e.stopPropagation()}>
                      {canDisable ? (
                        <button
                          type="button"
                          className={`ua-users-row-actions__disable${u.off ? " ua-users-row-actions__disable--on" : ""}`}
                          title={u.off ? `Re-enable ${u.name}'s account` : `Disable ${u.name}'s account — they lose app access, the record stays`}
                          onClick={() => askDisable(u)}
                          disabled={actionBusy}
                        >
                          <DisableIcon off={u.off} />
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          className="ua-users-row-actions__delete"
                          title={`Delete ${u.name}`}
                          onClick={() => setDeleteTarget(u)}
                          disabled={actionBusy}
                        >
                          <TrashIcon />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </TableScroll>

      {!loading && !loadError && listTotal > 0 ? (
        <div className="ua-users-pagination" aria-label="Users pagination">
          <div className="ua-users-pagination__meta">
            Showing <strong>{rangeStart}–{rangeEnd}</strong> of <strong>{listTotal}</strong>
            <span className="ua-users-pagination__sep">·</span>
            {PAGE_SIZE} per page
          </div>
          <div className="ua-users-pagination__controls">
            <button
              type="button"
              className="ua-users-pagination__btn"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
            >
              Prev
            </button>
            {pageItems.map((item, idx) => (
              item === "…" ? (
                <span key={`ellipsis-${idx}`} className="ua-users-pagination__ellipsis">…</span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={`ua-users-pagination__page${item === safePage ? " ua-users-pagination__page--active" : ""}`}
                  onClick={() => setPage(item)}
                  aria-current={item === safePage ? "page" : undefined}
                >
                  {item}
                </button>
              )
            ))}
            <button
              type="button"
              className="ua-users-pagination__btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {reassignAsk ? (
        <div
          className="ua-dialog-backdrop"
          onClick={() => {
            if (actionBusy) return;
            setSelectReset((n) => n + 1);
            setReassignAsk(null);
          }}
          role="presentation"
        >
          <div
            className="ua-dialog ua-dialog--confirm"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reassign-user-title"
          >
            <div className="ua-dialog__kicker ua-dialog__kicker--blue">Coach reassignment</div>
            <div id="reassign-user-title" className="ua-dialog__title ua-dialog__title--confirm">
              {reassignAsk.kind === "wc" ? "Assign wellness coach" : "Assign assistant WC"} for {reassignAsk.user.name}?
            </div>
            <p className="ua-dialog__body">
              <span className="ua-dialog__reassign-from">{reassignAsk.from || "Unassigned"}</span>
              {" → "}
              <span className="ua-dialog__reassign-to">{reassignAsk.to || "Unassigned"}</span>
              <br />
              This assigns the client’s {reassignAsk.kind === "wc" ? "wellness coach" : "assistant coach"} after you confirm.
            </p>
            <div className="ua-dialog__actions">
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => {
                  setSelectReset((n) => n + 1);
                  setReassignAsk(null);
                }}
                disabled={actionBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ua-dialog__btn-primary"
                onClick={confirmReassign}
                disabled={actionBusy}
              >
                {actionBusy ? "Assigning…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {conversionAsk ? (
        <div className="ua-dialog-backdrop" onClick={() => !actionBusy && setConversionAsk(null)} role="presentation">
          <div
            className="ua-dialog ua-dialog--confirm"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="convert-user-title"
          >
            <div className="ua-dialog__kicker">{conversionAsk.kicker}</div>
            <div id="convert-user-title" className="ua-dialog__title ua-dialog__title--confirm">
              {conversionAsk.title}
            </div>
            <p className="ua-dialog__body">{conversionAsk.body}</p>
            <div className="ua-dialog__actions">
              <button type="button" className="btn btn--outline" onClick={() => setConversionAsk(null)} disabled={actionBusy}>Cancel</button>
              <button type="button" className="ua-dialog__btn-primary" onClick={confirmConversion} disabled={actionBusy}>
                {actionBusy ? "Converting…" : conversionAsk.confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {disableTarget ? (
        <div className="ua-dialog-backdrop" onClick={() => !actionBusy && setDisableTarget(null)} role="presentation">
          <div
            className="ua-dialog ua-dialog--confirm ua-dialog--danger"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="disable-user-title"
          >
            <div className="ua-dialog__kicker">Account access</div>
            <div id="disable-user-title" className="ua-dialog__title ua-dialog__title--confirm">
              Disable {disableTarget.name}&rsquo;s account?
            </div>
            <p className="ua-dialog__body">
              They are signed out and cannot log in to the app. Their record, history and coach assignment all stay exactly as they are, and you can re-enable them at any time.
            </p>
            <div className="ua-dialog__actions">
              <button type="button" className="btn btn--outline" onClick={() => setDisableTarget(null)} disabled={actionBusy}>Cancel</button>
              <button type="button" className="ua-dialog__btn-danger" onClick={confirmDisable} disabled={actionBusy}>
                {actionBusy ? "Disabling…" : "Yes, disable it"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {canCreate ? (
        <Suspense fallback={null}>
          <CreateUserModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onToast={onToast}
            onCreated={() => refreshUsers()}
          />
        </Suspense>
      ) : null}

      {deleteTarget ? (
        <div className="ua-dialog-backdrop" onClick={() => !actionBusy && setDeleteTarget(null)} role="presentation">
          <div className="ua-dialog ua-dialog--danger" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-user-title">
            <div className="ua-dialog__head">
              <div className="ua-dialog__icon ua-dialog__icon--danger"><TrashIcon /></div>
              <div id="delete-user-title" className="ua-dialog__title">Archive {deleteTarget.name}?</div>
            </div>
            <p className="ua-dialog__body">
              This removes the client from active user lists and blocks account access. They can sign up again with the same email and phone number.
            </p>
            <div className="ua-dialog__actions">
              <button type="button" className="btn btn--outline" onClick={() => setDeleteTarget(null)} disabled={actionBusy}>Cancel</button>
              <button type="button" className="ua-dialog__btn-danger" onClick={confirmDelete} disabled={actionBusy}>
                {actionBusy ? "Archiving…" : "Archive user"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
