import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { CfgSelect, OrangeButton, PageHeader, PillTabs, SectionLabel, TableScroll, ListPagination } from "../components/shared.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import {
  STAFF_AVATARS,
  STAFF_COL3,
  TEAM_ROLE_META,
  TEAM_ROLE_TABS_BASE,
  staffInitials,
} from "../data/teamsData.js";
import { createTeamMember, fetchTeamMembers, listTeamParentOptions } from "../api/teamsApi.js";
import { fetchAccessRoles } from "../api/accessApi.js";
import { UI_TO_ROLE_KEY } from "../api/accountApi.js";
import { useViewAs } from "../context/ViewAsContext.jsx";

const SYSTEM_TEAM_ROLE_KEYS = new Set(["wc", "awc", "trainee", "support"]);
const PAGE_SIZE = 20;

function isAdminAccessRole(role) {
  const key = String(role?.roleKey || "").toLowerCase();
  return key === "admin";
}

function isSystemTeamRole(role) {
  const key = String(role?.roleKey || "").toLowerCase();
  return SYSTEM_TEAM_ROLE_KEYS.has(key);
}

/** Walk inheritance to a system UI role key (wc / awc / trainee / support). */
function resolveBaseUiRoleKey(role, allRoles) {
  const byId = Object.fromEntries((allRoles || []).map((r) => [r.id, r]));
  let current = role;
  const seen = new Set();
  while (current) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    const key = String(current.roleKey || "").toLowerCase();
    if (key && UI_TO_ROLE_KEY[key]) return key;
    current = current.inheritsFromRoleId ? byId[current.inheritsFromRoleId] : null;
  }
  return null;
}

function roleChipMeta(role, fallbackKey = "wc") {
  const key = role?.roleKey || fallbackKey;
  const base = TEAM_ROLE_META[key] || TEAM_ROLE_META.wc;
  return {
    name: role?.name || base.name,
    roleColor: role?.color || base.roleColor,
    roleBg: role?.bg || base.roleBg,
    roleBorder: role?.bd || base.roleBorder,
  };
}

function CreateMemberModal({ open, roles, parentOptions, onClose, onCreated, onToast }) {
  const creatableRoles = useMemo(
    () => (roles || []).filter((r) => !isAdminAccessRole(r)),
    [roles],
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consoleRoleId, setConsoleRoleId] = useState("");
  const [parentAccountId, setParentAccountId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setPhone("");
    setEmail("");
    const defaultRole = creatableRoles.find((r) => r.roleKey === "wc") || creatableRoles[0];
    setConsoleRoleId(defaultRole?.id || "");
    setParentAccountId("");
  }, [open, creatableRoles]);

  const selectedRole = creatableRoles.find((r) => r.id === consoleRoleId) || null;
  const baseUiKey = selectedRole ? resolveBaseUiRoleKey(selectedRole, creatableRoles) : null;
  const needsParent = baseUiKey === "awc" || baseUiKey === "trainee";
  const parentRoleKey =
    baseUiKey === "trainee" ? "assistant_wellness_coach" : "wellness_coach";
  const eligibleParents = useMemo(
    () =>
      (parentOptions || []).filter((account) =>
        account.roleKeys?.includes(parentRoleKey),
      ),
    [parentOptions, parentRoleKey],
  );

  useEffect(() => {
    if (!open || !needsParent) return;
    setParentAccountId((current) =>
      eligibleParents.some((parent) => parent.id === current)
        ? current
        : eligibleParents[0]?.id || "",
    );
  }, [open, needsParent, parentRoleKey, eligibleParents]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      onToast("Name and email are required");
      return;
    }
    if (!consoleRoleId) {
      onToast("Pick a role from Access Control");
      return;
    }
    if (needsParent && !parentAccountId) {
      onToast("Pick a Wellness Coach for this role");
      return;
    }
    setBusy(true);
    try {
      const result = await createTeamMember({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        consoleRoleId,
        roleKey: selectedRole?.roleKey || baseUiKey || undefined,
        parentAccountId: needsParent ? parentAccountId : undefined,
      });
      onToast(
        result.temporaryPassword
          ? `Created ${result.account?.name} · temp password ${result.temporaryPassword}`
          : `Created ${result.account?.name}`,
      );
      onCreated(result.account);
      onClose();
    } catch (err) {
      onToast(err?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ua-cp-modal-backdrop" onClick={busy ? undefined : onClose} role="presentation">
      <div
        className="ua-teams-create"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ua-teams-create-title"
      >
        <div className="ua-teams-create__head">
          <div className="ua-teams-create__lead">
            <span className="ua-teams-create__icon" aria-hidden="true">
            👤
            </span>
            <div className="ua-teams-create__copy">
              <h2 id="ua-teams-create-title">Create a team member</h2>
              <p>Works for every role</p>
            </div>
          </div>
          <button
            type="button"
            className="ua-cfg-icon-btn"
            aria-label="Close"
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <form className="ua-teams-create__form" onSubmit={handleSubmit}>
          <div className="ua-teams-create__body">
            <label className="ua-teams-create__field">
              <input
                className="ua-teams-create__input"
                placeholder="Full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoFocus
              />
            </label>
            <label className="ua-teams-create__field">
              <input
                className="ua-teams-create__input"
                placeholder="Mobile number"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <label className="ua-teams-create__field">
              <input
                className="ua-teams-create__input"
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="ua-teams-create__field">
              <span className="ua-teams-create__label">Role</span>
              <CfgSelect
                className="ua-teams-create__select"
                options={creatableRoles.map((role) => ({ value: role.id, label: role.name }))}
                value={consoleRoleId}
                disabled={busy || creatableRoles.length === 0}
                onChange={setConsoleRoleId}
                ariaLabel="Role"
                placeholder="No Access Control roles found"
              />
            </label>
            {needsParent ? (
              <label className="ua-teams-create__field">
                <span className="ua-teams-create__label">
                  Reports to ({baseUiKey === "trainee" ? "Assistant WC" : "Wellness Coach"})
                </span>
                <CfgSelect
                  className="ua-teams-create__select"
                  options={eligibleParents.map((coach) => ({
                    value: coach.id,
                    label: `${coach.name} · ${coach.email}`,
                  }))}
                  value={parentAccountId}
                  disabled={busy}
                  onChange={setParentAccountId}
                  ariaLabel="Reports to"
                  placeholder="Choose coach…"
                />
              </label>
            ) : null}
          </div>
          <div className="ua-teams-create__foot">
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy || !consoleRoleId}>
              {busy ? "Creating…" : "Create member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TeamsPage() {
  const { showToast: onToast } = useOutletContext();
  const { isSuperAdmin, viewAs } = useViewAs();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [members, setMembers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 1,
  });
  const [accessRoles, setAccessRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [parentOptions, setParentOptions] = useState([]);
  const [reloadNonce, setReloadNonce] = useState(0);

  const teamRoles = useMemo(
    () =>
      (accessRoles || []).filter((role) => {
        if (isAdminAccessRole(role)) return false;
        const baseUiKey = resolveBaseUiRoleKey(role, accessRoles);
        return Boolean(baseUiKey && SYSTEM_TEAM_ROLE_KEYS.has(baseUiKey));
      }),
    [accessRoles],
  );

  const createRoles = teamRoles;

  const pageParam = Number(searchParams.get("page"));
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const roleTab = searchParams.get("role") || teamRoles[0]?.id || "wc";

  const setPage = (page) => {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) next.delete("page");
    else next.set("page", String(page));
    setSearchParams(next, { replace: true });
  };

  const setRoleTab = (role) => {
    const next = new URLSearchParams(searchParams);
    const defaultId = teamRoles[0]?.id;
    if (!role || role === defaultId) next.delete("role");
    else next.set("role", role);
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const roleById = useMemo(
    () => Object.fromEntries(teamRoles.map((r) => [r.id, r])),
    [teamRoles],
  );

  const activeRole = roleById[roleTab];
  const activeBaseUiKey = activeRole ? resolveBaseUiRoleKey(activeRole, teamRoles) : null;
  const apiRoleKey = activeRole?.roleKey || activeBaseUiKey || (TEAM_ROLE_META[roleTab] ? roleTab : undefined);

  const loadRoles = useCallback(async () => {
    try {
      const roles = await fetchAccessRoles();
      setAccessRoles(Array.isArray(roles) ? roles : []);
    } catch {
      setAccessRoles([]);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const load = useCallback(() => {
    setReloadNonce((n) => n + 1);
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    let cancelled = false;
    async function loadMembers() {
      setLoading(true);
      setError("");
      try {
        const { members: rows, pagination: nextPagination } = await fetchTeamMembers({
          page: currentPage,
          limit: PAGE_SIZE,
          roleKey: apiRoleKey,
        });
        if (cancelled) return;
        const list = (rows || []).filter((m) => !m.isSuperAdmin && m.primaryRoleKey !== "admin");
        setMembers(list);
        setPagination({
          page: Number(nextPagination?.page) || currentPage,
          limit: Number(nextPagination?.limit) || PAGE_SIZE,
          total: Number(nextPagination?.total) || 0,
          pages: Math.max(1, Number(nextPagination?.pages) || 1),
        });
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "Failed to load team");
        setMembers([]);
        setPagination({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadMembers();
    return () => {
      cancelled = true;
    };
  }, [apiRoleKey, currentPage, reloadNonce]);

  useEffect(() => {
    if (loading || error) return;
    if (currentPage > pagination.pages) setPage(pagination.pages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, error, loading, pagination.pages]);

  useEffect(() => {
    if (!createOpen) return;
    listTeamParentOptions()
      .then(setParentOptions)
      .catch(() => setParentOptions([]));
  }, [createOpen]);

  const tabs = useMemo(() => {
    if (teamRoles.length) {
      return teamRoles.map((r) => ({
        id: r.id,
        label: r.name,
        count: r.memberCount || 0,
      }));
    }
    return TEAM_ROLE_TABS_BASE.map((t) => ({ ...t, count: 0 }));
  }, [teamRoles]);

  useEffect(() => {
    if (!teamRoles.length) return;
    if (!teamRoles.some((r) => r.id === roleTab)) {
      setRoleTab(teamRoles[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamRoles, roleTab]);

  const rows = members;

  const baseUiForCol = activeRole
    ? resolveBaseUiRoleKey(activeRole, teamRoles) || activeRole.roleKey
    : roleTab;
  const col3 = STAFF_COL3[baseUiForCol] || "Load";

  function openMember(id, focus) {
    const q = focus === "permissions" ? "?focus=permissions" : "";
    navigate(`${UPDATED_ADMIN_PATHS.teams}/${id}${q}`);
  }

  return (
    <main className="content ua-page-enter ua-teams-page">
      <PageHeader
        title="Teams & roles"
        subtitle={
          viewAs === "wc"
            ? "Your Assistant WCs and the trainees below them."
            : viewAs === "awc"
              ? "Trainees assigned below you."
              : "Each team = 1 Wellness Coach + N assistants + assigned clients. Manage every staff role below."
        }
        autosave
        onAutosave={() => onToast("Saved")}
        actions={isSuperAdmin ? (
          <OrangeButton onClick={() => setCreateOpen(true)}>+ Create team member</OrangeButton>
        ) : null}
      />

      <SectionLabel hint="Filter by Access Control role">Team</SectionLabel>
      <PillTabs tabs={tabs} active={roleTab} onChange={setRoleTab} />

      {loading ? <BrandLoader variant="page" label="Loading team…" /> : null}
      {error ? (
        <div className="ua-section-bar">
          <span>{error}</span>
          <OrangeButton onClick={load}>Retry</OrangeButton>
        </div>
      ) : null}

      {!loading && !error ? (
        <TableScroll>
          <div className="ua-table-card">
            <div className="ua-table ua-table--teams ua-table__head">
              <div>Name</div>
              <div>Role</div>
              <div>{col3}</div>
              <div>Status</div>
              <div style={{ textAlign: "right" }}>Actions</div>
            </div>
            {rows.length === 0 ? (
              <div className="ua-table ua-table--teams ua-table__row">
                <div className="ua-table__muted" style={{ gridColumn: "1 / -1" }}>
                  No members in this role yet.
                </div>
              </div>
            ) : null}
            {rows.map((s, i) => {
              const accessRole =
                (s.consoleRoleId && roleById[s.consoleRoleId]) ||
                teamRoles.find((r) => r.roleKey && r.roleKey === s.primaryRoleKey) ||
                null;
              const meta = roleChipMeta(accessRole, s.primaryRoleKey);
              return (
                <div
                  key={s.id}
                  className="ua-table ua-table--teams ua-table__row"
                  onClick={() => openMember(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") openMember(s.id);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="ua-user-cell">
                    <span
                      className="ua-avatar ua-avatar--staff"
                      style={{ background: STAFF_AVATARS[i % STAFF_AVATARS.length] }}
                    >
                      {staffInitials(s.name)}
                    </span>
                    <div className="ua-user-cell__meta">
                      <div className="ua-user-cell__name">{s.name}</div>
                      <div className="ua-user-cell__sub ua-user-cell__email">{s.email}</div>
                    </div>
                  </div>
                  <div data-label="Role">
                    <span
                      className="ua-role-chip"
                      style={{
                        background: meta.roleBg,
                        color: meta.roleColor,
                        borderColor: meta.roleBorder,
                      }}
                    >
                      {meta.name}
                    </span>
                  </div>
                  <div className="ua-table__load" data-label={col3}>{s.meta}</div>
                  <div data-label="Status">
                    <span
                      className={`ua-status-pill${
                        s.displayStatus === "Pending" ? " ua-status-pill--amber" : " ua-status-pill--green"
                      }`}
                    >
                      {s.displayStatus || "Active"}
                    </span>
                  </div>
                  <div className="ua-team-actions" data-label="Actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="ua-team-actions__perm"
                      onClick={() => openMember(s.id, isSuperAdmin || viewAs === "wc" ? "permissions" : undefined)}
                    >
                      {isSuperAdmin || viewAs === "wc" ? "Permissions" : "View members"} ›
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </TableScroll>
      ) : null}

      {!loading && !error ? (
        <ListPagination
          page={currentPage}
          pages={pagination.pages}
          total={pagination.total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="Team members pagination"
        />
      ) : null}

      <CreateMemberModal
        open={createOpen}
        roles={createRoles}
        parentOptions={parentOptions}
        onClose={() => setCreateOpen(false)}
        onCreated={() => load()}
        onToast={onToast}
      />
    </main>
  );
}
