import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { ExportIcon } from "../components/NavIcons.jsx";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { OrangeButton, PageHeader, PillTabs, ScopeChip, TableScroll } from "../components/shared.jsx";
import {
  TIER_OPTIONS,
  UNASSIGNED_COACH,
  USER_TYPE_TAB_DEFS,
  avatarColor,
  enrichUser,
  canDowngradeTier,
  lastActiveMinutes,
  nextTier,
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
  fetchScopedUsers,
  fetchUsers,
  mapUiStatusToApi,
  mapUiTierToApi,
  moveMaintenanceUserToHeal,
  moveUserToMaintenance,
  moveUserToSeek,
  reassignUserCoach,
  updateUserStatus,
} from "../api/usersApi.js";
import { fetchTeamMembers } from "../api/teamsApi.js";
import { useViewAs } from "../context/ViewAsContext.jsx";

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

const PAGE_SIZE = 20;

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
  const { activeRole, can, dataScope } = useViewAs();
  const [searchParams, setSearchParams] = useSearchParams();

  const canCreate = can("console.cl.create");
  const canEdit = can("console.cl.edit");
  const canDelete = can("console.cl.delete");
  const canExport = can("console.cl.export");
  // Reassignment needs both the Teams feature and write access on the client record.
  const canReassignAwc = can("console.ra.edit") && canEdit;
  // Moving a client between wellness coaches is only meaningful for roles that
  // can see every roster — a coach may only pick assistants from their own team.
  const canReassignWc = canReassignAwc && dataScope === "all";
  const showRowActions = canEdit || canDelete;
  const isReadOnly = !canEdit && !canDelete && !canCreate;
  // Roles scoped to their own roster read through the hierarchy-aware endpoint.
  const useScopedUsers = dataScope !== "all";

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
  const [disabledUsers, setDisabledUsers] = useState([]);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [disableTarget, setDisableTarget] = useState(null);
  const [reassignAsk, setReassignAsk] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [selectReset, setSelectReset] = useState(0);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [openTierMore, setOpenTierMore] = useState(null);

  const typeTab = searchParams.get("tab") || "all";
  const tierFilter = searchParams.get("tier") || "";
  const coachFilter = searchParams.get("coach") || "";
  const pageParam = Number(searchParams.get("page"));
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (disableTarget || deleteTarget || reassignAsk) {
      document.activeElement?.blur?.();
    }
  }, [disableTarget, deleteTarget, reassignAsk]);

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

  useEffect(() => {
    let cancelled = false;
    async function loadUsers() {
      setLoading(true);
      setLoadError("");
      try {
        const tabTier = typeTab === "app" ? "maintenance" : undefined;
        const tabCategory = typeTab === "team" ? "eagle" : undefined;
        const params = {
          page: currentPage,
          limit: PAGE_SIZE,
          search: debouncedSearch || undefined,
          status: mapUiStatusToApi(statusFilter),
          userTier: mapUiTierToApi(tierFilter) || tabTier,
          clientCategory: tabCategory,
          parentCoachId: coachFilter || undefined,
        };
        const userResult = useScopedUsers
          ? await fetchScopedUsers({
              page: params.page,
              limit: params.limit,
              search: params.search,
              userTier: params.userTier,
            })
          : await fetchUsers(params);
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
  }, [
    coachFilter,
    currentPage,
    debouncedSearch,
    reloadNonce,
    statusFilter,
    tierFilter,
    typeTab,
    useScopedUsers,
  ]);

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

  const basePool = useMemo(
    () => users.filter((u) => !deletedUsers.includes(userOverrideKey(u))),
    [deletedUsers, users],
  );

  const enrichedPool = useMemo(
    () => basePool.map((u) => enrichUser(u, overrideState)),
    [basePool, overrideState],
  );

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

  const typeTabs = useMemo(
    () => USER_TYPE_TAB_DEFS.map((def) => ({
      id: def.id || "all",
      label: def.label,
      count: def.id ? undefined : pagination.total,
    })),
    [pagination.total],
  );

  const pageRows = useMemo(() => {
    let list = enrichedPool;
    if (sort) {
      const dir = sort.dir === "desc" ? -1 : 1;
      list = [...list].sort((a, b) => (
        sort.key === "name"
          ? dir * String(a.name || "").localeCompare(String(b.name || ""))
          : dir * (lastActiveMinutes(a.lastActive) - lastActiveMinutes(b.lastActive))
      ));
    }
    return list;
  }, [enrichedPool, sort]);

  const totalCount = pagination.total;
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

  const rangeStart = totalCount === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = totalCount === 0 ? 0 : rangeStart + pageRows.length - 1;

  const goToFirstPage = () => {
    if (currentPage > 1) setPage(1);
  };

  const toggleSort = (key) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const convertTier = async (user) => {
    const key = userOverrideKey(user);
    if (user.tier === "Seek to Heal") {
      setActionBusy(true);
      try {
        const updated = await moveUserToMaintenance(key);
        setUsers((prev) => prev.map((row) => (
          userOverrideKey(row) === key ? { ...row, ...updated } : row
        )));
        onToast(`${user.name} moved to MAINTENANCE`);
      } catch (err) {
        onToast(err?.message || "Could not move user to maintenance");
      } finally {
        setActionBusy(false);
      }
      return;
    }
    const nx = nextTier(user.tier);
    setTierOverrides((prev) => ({ ...prev, [key]: nx }));
    onToast(`${user.name} moved to ${tierLabel(nx)} by Admin`);
  };

  const downgradeTier = async (user) => {
    const key = userOverrideKey(user);
    if (user.tier === "Maintenance") {
      setActionBusy(true);
      try {
        const updated = await moveMaintenanceUserToHeal(key);
        setUsers((prev) => prev.map((row) => (
          userOverrideKey(row) === key ? { ...row, ...updated } : row
        )));
        onToast(`${user.name} moved back to HEAL`);
      } catch (err) {
        onToast(err?.message || "Could not move user back to Heal");
      } finally {
        setActionBusy(false);
      }
      return;
    }
    if (user.tier === "Seek to Heal") {
      setActionBusy(true);
      try {
        const updated = await moveUserToSeek(key);
        setUsers((prev) => prev.map((row) => (
          userOverrideKey(row) === key ? { ...row, ...updated } : row
        )));
        onToast(`${user.name} moved down to SEEK`);
      } catch (err) {
        onToast(err?.message || "Could not move user to Seek");
      } finally {
        setActionBusy(false);
      }
      return;
    }
    const dn = prevTier(user.tier);
    setTierOverrides((prev) => ({ ...prev, [key]: dn }));
    onToast(`${user.name} moved down to ${tierLabel(dn)} by Admin`);
  };

  const revertTier = (user) => {
    const key = userOverrideKey(user);
    setTierOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    onToast(`Manual conversion undone for ${user.name}`);
  };

  const askDisable = async (user) => {
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
    if (!disableTarget) return;
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
          autosave
          onAutosave={() => onToast("Saved")}
          meta={(
            <>
              <span className="page-head__count">{loading ? "…" : totalCount}</span> clients ·{" "}
              {useScopedUsers ? <span>Your assigned clients</span> : <ScopeChip />}
            </>
          )}
        />

        <div className="ua-users-toolbar">
          <div className="ua-search-wrap ua-search-wrap--wide">
            <svg className="ua-search-wrap__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              className="ua-search-wrap__input"
              placeholder="Search name, email, phone"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                goToFirstPage();
              }}
            />
          </div>
          <select className="header__select ua-users-filter" value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
            {TIER_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            className="header__select ua-users-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              goToFirstPage();
            }}
          >
            <option value="">All status</option>
            <option>Active</option>
            <option>Disabled</option>
          </select>
          {canExport ? (
            <button type="button" className="btn btn--outline ua-users-export" onClick={() => onToast("Exporting CSV…")}>
              <ExportIcon /> Export CSV
            </button>
          ) : null}
          {canCreate ? (
            <OrangeButton onClick={() => onToast("Add user — coming soon")}>+ Add user</OrangeButton>
          ) : null}
        </div>

        {coachFilter ? (
          <div className="ua-coach-filter">
            <span className="ua-coach-filter__label">
              Coach: {teamMembers.find((m) => String(m.id) === String(coachFilter))?.name || coachFilter}
            </span>
            <button type="button" className="ua-coach-filter__clear" title="Clear coach filter" onClick={clearCoachFilter}>×</button>
          </div>
        ) : null}

        <PillTabs tabs={typeTabs} active={typeTab} onChange={setTypeTab} />
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
        <div className="ua-table-card ua-table-card--users">
          <div className={`ua-table ua-table--users${showRowActions ? "" : " ua-table--users-readonly"} ua-table__head`}>
            <div>#</div>
            <div>
              <SortButton
                label="Name"
                active={sort?.key === "name"}
                direction={sort?.dir}
                onClick={() => toggleSort("name")}
              />
            </div>
            <div>Tier</div>
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
            {showRowActions ? <div /> : null}
          </div>

          {loading ? (
            <BrandLoader variant="page" label="Loading clients…" />
          ) : rows.length === 0 ? (
            <div className="ua-users-empty">
              <div className="ua-users-empty__icon"><UsersEmptyIcon /></div>
              <div className="ua-users-empty__title">No clients found</div>
              <p className="ua-users-empty__sub">No records match your filters. Try clearing the search or filters.</p>
              <button type="button" className="btn btn--outline" onClick={clearFilters}>Clear filters</button>
            </div>
          ) : (
            rows.map((u, i) => {
              const tier = tierStyle(u.tier);
              const tone = u.off || u.status === "Disabled" ? "red" : u.status === "Active" ? "green" : "muted";
              const canConvert = u.tier !== "Maintenance";
              const canDowngrade = canDowngradeTier(u.tier, u.ageDays);
              const rowKey = userOverrideKey(u) || u.name;
              const extraCount = Number(canEdit && canConvert) + Number(canEdit && canDowngrade) + Number(canEdit && u.converted);
              const tierOpen = openTierMore === rowKey;

              return (
                <div
                  key={rowKey}
                  className={`ua-table ua-table--users${showRowActions ? "" : " ua-table--users-readonly"} ua-table__row`}
                  onClick={() => openUser(u)}
                >
                  <div className="ua-table__muted">{u.n}</div>
                  <div className="ua-user-cell">
                    <span className="ua-avatar" style={{ background: avatarColor(i) }}>{userInitials(u.name)}</span>
                    <div className="ua-user-cell__meta">
                      <div className="ua-user-cell__name" title={u.name}>{u.name}</div>
                      <div className="ua-user-cell__sub">
                        <span className="ua-user-cell__email" title={userSubline(u)}>{userSubline(u)}</span>
                        {u.goal ? (
                          <span className="ua-user-cell__concern" title={u.goal}>{u.goal}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className={`ua-users-tier${tierOpen ? " is-open" : ""}`} onClick={(e) => e.stopPropagation()}>
                    <span className="ua-tier" style={{ background: tier.bg, color: tier.color }}>{tierLabel(u.tier)}</span>
                    {extraCount > 0 ? (
                      <button
                        type="button"
                        className="ua-tier-more"
                        aria-expanded={tierOpen}
                        onClick={() => setOpenTierMore(tierOpen ? null : rowKey)}
                      >
                        {tierOpen ? "Hide" : `+${extraCount} more`}
                      </button>
                    ) : null}
                    {tierOpen ? (
                      <>
                        {canEdit && canConvert ? (
                          <button
                            type="button"
                            className="ua-tier-action ua-tier-action--up"
                            title={u.tier === "Seek to Heal"
                              ? `Move ${u.name} into MAINTENANCE — for when every goal has been achieved`
                              : `Move ${u.name} up to ${u.tier === "Seek" ? "PWC" : "HEAL"} by hand — for when the automatic upgrade did not go through`}
                            onClick={() => convertTier(u)}
                            disabled={actionBusy}
                          >
                            → {tierLabel(nextTier(u.tier))}
                          </button>
                        ) : null}
                        {canEdit && canDowngrade ? (
                          <button
                            type="button"
                            className="ua-tier-action ua-tier-action--down"
                            title={u.tier === "Maintenance"
                              ? `Move ${u.name} back to HEAL — for when maintenance was entered too early`
                              : `Move ${u.name} back down to SEEK — ends paid coaching entitlements`}
                            onClick={() => downgradeTier(u)}
                            disabled={actionBusy}
                          >
                            ↓ {tierLabel(prevTier(u.tier))}
                          </button>
                        ) : null}
                        {canEdit && u.converted ? (
                          <button type="button" className="ua-tier-action ua-tier-action--undo" title="Undo this manual change" onClick={() => revertTier(u)}>undo</button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    {!canReassignWc ? (
                      <span>{u.coach || UNASSIGNED_COACH}</span>
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
                  <div onClick={(e) => e.stopPropagation()}>
                    {!canReassignAwc ? (
                      <span>{u.awc || "—"}</span>
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
                  <div className="ua-table__muted">{u.lastActive || "—"}</div>
                  <div>
                    <span className={`ua-status-badge ua-status-badge--${tone}`}>
                      <span className="ua-status-badge__dot" />
                      {u.status}
                    </span>
                  </div>
                  {showRowActions ? (
                    <div className="ua-users-row-actions" onClick={(e) => e.stopPropagation()}>
                      {canEdit ? (
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

      {!loading && !loadError && totalCount > 0 ? (
        <div className="ua-users-pagination" aria-label="Users pagination">
          <div className="ua-users-pagination__meta">
            Showing <strong>{rangeStart}–{rangeEnd}</strong> of <strong>{totalCount}</strong>
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
