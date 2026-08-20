import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { TeamRemindModal } from "../components/TeamRemindModal.jsx";
import { CfgSelect, OrangeButton, PageHeader, PillTabs, SectionLabel, TableScroll, ListPagination } from "../components/shared.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import {
  STAFF_AVATARS,
  STAFF_COL3,
  TEAM_ROLE_META,
  TEAM_ROLE_TABS_BASE,
  staffInitials,
} from "../data/teamsData.js";
import { createTeamMember, deleteTeamMember, fetchTeamMembers, listTeamParentOptions, sendTeamReminder, setAccessMemberRole, updateTeamMember } from "../api/teamsApi.js";
import { fetchAccessRoles } from "../api/accessApi.js";
import { useViewAs } from "../context/ViewAsContext.jsx";
import {
  EMAIL_MAX_LEN,
  PERSON_NAME_MAX_LEN,
  PHONE_NATIONAL_LEN,
  blockIndianMobileFirstDigitKeyDown,
  blockPersonNameDigitKeyDown,
  sanitizeEmailInput,
  sanitizePersonName,
  sanitizePhoneDigits,
  validateEmail,
  validatePersonName,
  validatePhoneDigits,
} from "../utils/personFieldValidation.js";
import { resolveBaseUiRoleKey, SYSTEM_TEAM_UI_KEYS } from "../utils/liveRoles.js";

const SYSTEM_TEAM_ROLE_KEYS = SYSTEM_TEAM_UI_KEYS;
const PAGE_SIZE = 20;
const ALL_TAB_ID = "all";
const ROLE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ACTION_ICON = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function IconEditProfile() {
  return (
    <svg {...ACTION_ICON}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function IconDeleteMember() {
  return (
    <svg {...ACTION_ICON}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function memberRemindMessage(name) {
  const first = String(name || "").trim().split(/\s+/)[0] || "there";
  return `Hi ${first}, a quick reminder on your pending items — please take a look when you get a moment.`;
}

function isAdminAccessRole(role) {
  const key = String(role?.roleKey || "").toLowerCase();
  return key === "admin";
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

function nationalPhoneDigits(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.slice(-PHONE_NATIONAL_LEN);
}

function CreateMemberModal({ open, member, roles, parentOptions, onClose, onSaved, onToast }) {
  const creatableRoles = useMemo(
    () => (roles || []).filter((r) => !isAdminAccessRole(r)),
    [roles],
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consoleRoleId, setConsoleRoleId] = useState("");
  const [parentAccountId, setParentAccountId] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  function clearError(key) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  const isEdit = Boolean(member?.id);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (member?.id) {
      setName(sanitizePersonName(member.name || ""));
      setPhone(nationalPhoneDigits(member.phone));
      setEmail(sanitizeEmailInput(member.email || ""));
      setConsoleRoleId(member.consoleRoleId || "");
      setParentAccountId(member.parentAccountId || "");
      return;
    }
    setName("");
    setPhone("");
    setEmail("");
    const defaultRole = creatableRoles.find((r) => r.roleKey === "wc") || creatableRoles[0];
    setConsoleRoleId(defaultRole?.id || "");
    setParentAccountId("");
  }, [open, creatableRoles, member]);

  const selectedRole = creatableRoles.find((r) => r.id === consoleRoleId) || null;
  const baseUiKey = selectedRole ? resolveBaseUiRoleKey(selectedRole, creatableRoles) : null;
  const needsParent = baseUiKey === "awc" || baseUiKey === "trainee";
  const parentRoleKey =
    baseUiKey === "trainee" ? "assistant_wellness_coach" : "wellness_coach";
  const eligibleParents = useMemo(
    () =>
      (parentOptions || []).filter((account) =>
        account.roleKeys?.includes(parentRoleKey) &&
        (!member?.id || account.id !== member.id),
      ),
    [parentOptions, parentRoleKey, member?.id],
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

  function validate() {
    const next = {};
    const nameErr = validatePersonName(name);
    if (nameErr) next.name = nameErr;
    const phoneErr = validatePhoneDigits(phone);
    if (phoneErr) next.phone = phoneErr;
    if (!isEdit) {
      const emailErr = validateEmail(email);
      if (emailErr) next.email = emailErr;
    }
    if (!consoleRoleId) next.role = "Pick a role.";
    if (needsParent && !parentAccountId) {
      next.parent = `Pick a ${baseUiKey === "trainee" ? "Assistant WC" : "Wellness Coach"} this person reports to.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      if (isEdit) {
        const result = await updateTeamMember(member.id, {
          name: name.trim(),
          phone: phone.trim(),
          phoneCountryCode: member.phoneCountryCode || "+91",
        });
        const roleChanged = consoleRoleId !== (member.consoleRoleId || "");
        const nextParent = needsParent ? parentAccountId : "";
        const parentChanged = nextParent !== (member.parentAccountId || "");
        if (roleChanged || parentChanged) {
          await setAccessMemberRole(member.id, {
            consoleRoleId,
            roleKey: selectedRole?.roleKey || baseUiKey || undefined,
            parentAccountId: needsParent ? parentAccountId : null,
          });
        }
        onToast(`Updated ${result.account?.name || name.trim()}`);
        onSaved(result.account);
        onClose();
        return;
      }
      const result = await createTeamMember({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        phoneCountryCode: "+91",
        consoleRoleId,
        roleKey: selectedRole?.roleKey || baseUiKey || undefined,
        parentAccountId: needsParent ? parentAccountId : undefined,
      });
      onToast(
        result.temporaryPassword
          ? `Created ${result.account?.name} · temp password ${result.temporaryPassword}`
          : `Created ${result.account?.name}`,
      );
      onSaved(result.account);
      onClose();
    } catch (err) {
      onToast(err?.message || (isEdit ? "Update failed" : "Create failed"));
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
              <h2 id="ua-teams-create-title">{isEdit ? "Edit profile" : "Create a team member"}</h2>
              <p>{isEdit ? "Same fields as create · email cannot be changed" : "Works for every role"}</p>
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
        <form className="ua-teams-create__form" onSubmit={handleSubmit} noValidate>
          <div className="ua-teams-create__body">
            <label className="ua-teams-create__field">
              <span className="ua-teams-create__label">
                Full name <span aria-hidden="true">*</span>
              </span>
              <input
                className={`ua-teams-create__input${errors.name ? " is-invalid" : ""}`}
                placeholder="e.g. Anita Rao"
                value={name}
                maxLength={PERSON_NAME_MAX_LEN}
                autoComplete="name"
                onKeyDown={blockPersonNameDigitKeyDown}
                onChange={(event) => {
                  setName(sanitizePersonName(event.target.value));
                  clearError("name");
                }}
                autoFocus
              />
              {errors.name ? <span className="ua-teams-create__error">{errors.name}</span> : (
                <span className="ua-teams-create__hint">Letters only · max {PERSON_NAME_MAX_LEN} characters</span>
              )}
            </label>
            <label className="ua-teams-create__field">
              <span className="ua-teams-create__label">
                Mobile number <span aria-hidden="true">*</span>
              </span>
              <input
                className={`ua-teams-create__input${errors.phone ? " is-invalid" : ""}`}
                placeholder="10-digit mobile"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                maxLength={PHONE_NATIONAL_LEN}
                onKeyDown={blockIndianMobileFirstDigitKeyDown}
                onChange={(event) => {
                  setPhone(sanitizePhoneDigits(event.target.value));
                  clearError("phone");
                }}
              />
              {errors.phone ? <span className="ua-teams-create__error">{errors.phone}</span> : (
                <span className="ua-teams-create__hint">Exactly {PHONE_NATIONAL_LEN} digits, starting with 6–9</span>
              )}
            </label>
            <label className="ua-teams-create__field">
              <span className="ua-teams-create__label">
                Email address <span aria-hidden="true">*</span>
              </span>
              <input
                className={`ua-teams-create__input${errors.email ? " is-invalid" : ""}${isEdit ? " is-readonly" : ""}`}
                placeholder="name@company.com"
                type="email"
                autoComplete="email"
                value={email}
                maxLength={EMAIL_MAX_LEN}
                readOnly={isEdit}
                aria-readonly={isEdit ? "true" : undefined}
                onChange={isEdit ? undefined : (event) => {
                  setEmail(sanitizeEmailInput(event.target.value));
                  clearError("email");
                }}
              />
              {errors.email ? <span className="ua-teams-create__error">{errors.email}</span> : (
                <span className="ua-teams-create__hint">
                  {isEdit ? "Email is used to sign in and cannot be changed" : `Max ${EMAIL_MAX_LEN} characters`}
                </span>
              )}
            </label>
            <label className="ua-teams-create__field">
              <span className="ua-teams-create__label">
                Role <span aria-hidden="true">*</span>
              </span>
              <CfgSelect
                className={`ua-teams-create__select${errors.role ? " is-invalid" : ""}`}
                options={creatableRoles.map((role) => ({ value: role.id, label: role.name }))}
                value={consoleRoleId}
                disabled={busy || creatableRoles.length === 0}
                onChange={(value) => {
                  setConsoleRoleId(value);
                  clearError("role");
                }}
                ariaLabel="Role"
                placeholder="No Access Control roles found"
              />
              {errors.role ? <span className="ua-teams-create__error">{errors.role}</span> : null}
            </label>
            {needsParent ? (
              <label className="ua-teams-create__field">
                <span className="ua-teams-create__label">
                  Reports to ({baseUiKey === "trainee" ? "Assistant WC" : "Wellness Coach"}){" "}
                  <span aria-hidden="true">*</span>
                </span>
                <CfgSelect
                  className={`ua-teams-create__select${errors.parent ? " is-invalid" : ""}`}
                  options={eligibleParents.map((coach) => ({
                    value: coach.id,
                    label: `${coach.name} · ${coach.email}`,
                  }))}
                  value={parentAccountId}
                  disabled={busy}
                  onChange={(value) => {
                    setParentAccountId(value);
                    clearError("parent");
                  }}
                  ariaLabel="Reports to"
                  placeholder="Choose coach…"
                />
                {errors.parent ? <span className="ua-teams-create__error">{errors.parent}</span> : null}
              </label>
            ) : null}
          </div>
          <div className="ua-teams-create__foot">
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy || !consoleRoleId}>
              {busy ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save changes" : "Create member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TeamsPage() {
  const { showToast: onToast } = useOutletContext();
  const { isSuperAdmin, viewAs, sessionUi } = useViewAs();
  const teamsPersona = isSuperAdmin ? viewAs : sessionUi || viewAs;
  const actorIsWc = teamsPersona === "wc";
  const actorIsAwc = teamsPersona === "awc";
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
  const [rolesReady, setRolesReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [remindModal, setRemindModal] = useState(null);
  const [remindBusy, setRemindBusy] = useState(false);
  const [parentOptions, setParentOptions] = useState([]);
  const [reloadNonce, setReloadNonce] = useState(0);

  function openMemberRemind(member, roleName) {
    const name = member?.name || "team member";
    const defaultMessage = memberRemindMessage(name);
    setRemindModal({
      title: `Remind ${name}`,
      subtitle: [roleName, member?.meta].filter(Boolean).join(" · "),
      recipients: [name],
      accountIds: member?.id ? [member.id] : [],
      defaultMessage,
      message: defaultMessage,
    });
  }

  const teamRoles = useMemo(
    () =>
      (accessRoles || []).filter((role) => {
        if (isAdminAccessRole(role)) return false;
        const baseUiKey = resolveBaseUiRoleKey(role, accessRoles);
        if (!baseUiKey || !SYSTEM_TEAM_ROLE_KEYS.has(baseUiKey)) return false;
        if (actorIsAwc) return baseUiKey === "trainee";
        if (actorIsWc) return baseUiKey === "awc" || baseUiKey === "trainee";
        return true;
      }),
    [accessRoles, actorIsAwc, actorIsWc],
  );

  const createRoles = teamRoles;

  const pageParam = Number(searchParams.get("page"));
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const roleParam = searchParams.get("role") || "";
  const roleTab = roleParam || ALL_TAB_ID;
  const isAllTab = roleTab === ALL_TAB_ID;

  const setPage = (page) => {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) next.delete("page");
    else next.set("page", String(page));
    setSearchParams(next, { replace: true });
  };

  const setRoleTab = (role) => {
    const next = new URLSearchParams(searchParams);
    if (!role || role === ALL_TAB_ID) next.delete("role");
    else next.set("role", role);
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const roleById = useMemo(
    () => Object.fromEntries(teamRoles.map((r) => [r.id, r])),
    [teamRoles],
  );

  const activeRole = isAllTab ? null : roleById[roleTab];
  const selectedConsoleRoleId = !isAllTab && ROLE_ID_RE.test(roleTab) ? roleTab : undefined;
  const fallbackUiRoleKey = !isAllTab && TEAM_ROLE_META[roleTab] ? roleTab : undefined;

  const loadRoles = useCallback(async () => {
    try {
      const roles = await fetchAccessRoles();
      setAccessRoles(Array.isArray(roles) ? roles : []);
    } catch {
      setAccessRoles([]);
    } finally {
      setRolesReady(true);
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
      if (!isAllTab && !selectedConsoleRoleId && !rolesReady) return;
      setLoading(true);
      setError("");
      try {
        const { members: rows, pagination: nextPagination } = await fetchTeamMembers({
          page: currentPage,
          limit: PAGE_SIZE,
          consoleRoleId: selectedConsoleRoleId,
          roleKey: selectedConsoleRoleId ? undefined : fallbackUiRoleKey,
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
  }, [isAllTab, selectedConsoleRoleId, fallbackUiRoleKey, rolesReady, currentPage, reloadNonce]);

  useEffect(() => {
    if (loading || error) return;
    if (currentPage > pagination.pages) setPage(pagination.pages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, error, loading, pagination.pages]);

  useEffect(() => {
    if (!createOpen && !editingMember) return;
    listTeamParentOptions()
      .then(setParentOptions)
      .catch(() => setParentOptions([]));
  }, [createOpen, editingMember]);

  const tabs = useMemo(() => {
    const roleTabs = teamRoles.length
      ? teamRoles.map((r) => ({
          id: r.id,
          label: r.name,
          count: r.memberCount || 0,
        }))
      : actorIsAwc || actorIsWc
        ? []
        : TEAM_ROLE_TABS_BASE.map((t) => ({ ...t, count: 0 }));
    const allCount = roleTabs.reduce((sum, tab) => sum + (Number(tab.count) || 0), 0);
    return [{ id: ALL_TAB_ID, label: "All", count: allCount }, ...roleTabs];
  }, [actorIsAwc, actorIsWc, teamRoles]);

  useEffect(() => {
    if (!teamRoles.length) return;
    if (isAllTab) return;
    if (!teamRoles.some((r) => r.id === roleTab || r.roleKey === roleTab)) {
      setRoleTab(ALL_TAB_ID);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamRoles, roleTab, isAllTab]);

  const rows = useMemo(() => {
    if (!actorIsAwc) return members;
    return members.filter((m) => {
      const accessRole =
        (m.consoleRoleId && roleById[m.consoleRoleId]) ||
        teamRoles.find((r) => r.roleKey && r.roleKey === m.primaryRoleKey) ||
        null;
      const baseUi =
        (accessRole && resolveBaseUiRoleKey(accessRole, teamRoles)) ||
        String(m.primaryRoleKey || "").toLowerCase();
      return baseUi === "trainee";
    });
  }, [actorIsAwc, members, roleById, teamRoles]);

  const baseUiForCol = activeRole
    ? resolveBaseUiRoleKey(activeRole, teamRoles) || activeRole.roleKey
    : null;
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
          actorIsWc
            ? "Your Assistant WCs and the trainees below them."
            : actorIsAwc
              ? "Trainees assigned below you."
              : "Each team = 1 Wellness Coach + N assistants + assigned clients. Manage every staff role below."
        }
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
                  {isAllTab ? "No team members yet." : "No members in this role yet."}
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
                    {isSuperAdmin ? (
                      <>
                        <button
                          type="button"
                          className="ua-team-actions__bell"
                          title="Send reminder"
                          aria-label={`Send reminder to ${s.name}`}
                          onClick={() => openMemberRemind(s, meta.name)}
                        >
                          🔔
                        </button>
                        <button
                          type="button"
                          className="ua-team-actions__perm ua-team-actions__icon"
                          title="Edit profile"
                          aria-label={`Edit profile for ${s.name}`}
                          onClick={() => setEditingMember(s)}
                        >
                          <IconEditProfile />
                        </button>
                        <button
                          type="button"
                          className="ua-team-actions__perm ua-team-actions__perm--danger ua-team-actions__icon"
                          title="Delete"
                          aria-label={`Delete ${s.name}`}
                          onClick={() => setDeletingMember(s)}
                        >
                          <IconDeleteMember />
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      className="ua-team-actions__perm"
                      onClick={() => openMember(s.id, isSuperAdmin || actorIsWc ? "permissions" : undefined)}
                    >
                      {isSuperAdmin || actorIsWc ? "Permissions" : "View members"} ›
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
        open={createOpen || Boolean(editingMember)}
        member={editingMember}
        roles={createRoles}
        parentOptions={parentOptions}
        onClose={() => {
          setCreateOpen(false);
          setEditingMember(null);
        }}
        onSaved={() => load()}
        onToast={onToast}
      />

      <ConfirmDialog
        open={Boolean(deletingMember)}
        tag="Teams"
        title={deletingMember ? `Delete ${deletingMember.name}?` : "Delete team member?"}
        body="This only works if no users are assigned to this team member. If anyone is assigned, they must be reassigned first."
        cancelLabel="Cancel"
        confirmLabel={deleteBusy ? "Deleting…" : "Delete user"}
        confirmTone="danger"
        onCancel={deleteBusy ? undefined : () => setDeletingMember(null)}
        onConfirm={async () => {
          if (!deletingMember || deleteBusy) return;
          setDeleteBusy(true);
          try {
            await deleteTeamMember(deletingMember.id);
            onToast(`Deleted ${deletingMember.name}`);
            setDeletingMember(null);
            load();
          } catch (err) {
            onToast(err?.message || "Delete failed");
            setDeletingMember(null);
          } finally {
            setDeleteBusy(false);
          }
        }}
      />

      <TeamRemindModal
        open={Boolean(remindModal)}
        title={remindModal?.title ?? ""}
        subtitle={remindModal?.subtitle ?? ""}
        recipients={remindModal?.recipients ?? []}
        message={remindModal?.message ?? ""}
        defaultMessage={remindModal?.defaultMessage ?? ""}
        busy={remindBusy}
        onMessageChange={(message) => setRemindModal((prev) => (prev ? { ...prev, message } : prev))}
        onReset={() => setRemindModal((prev) => (prev ? { ...prev, message: prev.defaultMessage } : prev))}
        onPush={async () => {
          if (!remindModal || remindBusy) return;
          const message = String(remindModal.message || "").trim();
          const accountIds = Array.isArray(remindModal.accountIds) ? remindModal.accountIds : [];
          if (!message) {
            onToast("Write a reminder message first");
            return;
          }
          if (!accountIds.length) {
            onToast("No team member to notify");
            return;
          }
          setRemindBusy(true);
          try {
            const data = await sendTeamReminder({ accountIds, message });
            onToast(data?.message || `Notification sent to ${remindModal.recipients?.length ?? 0} recipient(s)`);
            setRemindModal(null);
          } catch (err) {
            onToast(err?.message || "Failed to send notification");
          } finally {
            setRemindBusy(false);
          }
        }}
        onWhatsApp={() => {
          if (remindBusy) return;
          onToast(`WhatsApp sent to ${remindModal?.recipients.length ?? 0} recipient(s)`);
          setRemindModal(null);
        }}
        onClose={() => {
          if (!remindBusy) setRemindModal(null);
        }}
      />
    </main>
  );
}
