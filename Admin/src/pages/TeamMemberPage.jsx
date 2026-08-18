import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { OrangeButton, PageHeader } from "../components/shared.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { STAFF_AVATARS, TEAM_ROLE_META, staffInitials } from "../data/teamsData.js";
import {
  PERM_ACTS,
  PERM_CATALOG,
  TOTAL_PERM_SLOTS,
  cloneGrants,
} from "../data/accessData.js";
import { fetchAccessCatalog, fetchAccessRoles } from "../api/accessApi.js";
import {
  fetchTeamMember,
  saveTeamMemberPermissions,
  setAccessMemberRole,
} from "../api/teamsApi.js";

const SYSTEM_TEAM_ROLE_KEYS = ["wc", "awc", "support", "trainee"];

function resolveBaseUiRoleKey(role, allRoles) {
  const byId = Object.fromEntries((allRoles || []).map((r) => [r.id, r]));
  let current = role;
  const seen = new Set();
  while (current) {
    const currentId = current.id || current.roleKey;
    if (!currentId || seen.has(currentId)) break;
    seen.add(currentId);
    const key = String(current.roleKey || "").toLowerCase();
    if (SYSTEM_TEAM_ROLE_KEYS.includes(key)) return key;
    current = current.inheritsFromRoleId ? byId[current.inheritsFromRoleId] : null;
  }
  return null;
}

function catalogRowsFromApi(catalog) {
  if (!Array.isArray(catalog?.features) || !catalog.features.length) return PERM_CATALOG;
  return catalog.features.map((feature) => [
    feature.sectionLabel,
    feature.featureName,
    feature.featureId,
    Array.isArray(feature.actions) ? feature.actions : [],
    feature.sectionId,
  ]);
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

function memberHas(grants, featureId, action) {
  if (grants == null) return true;
  return Boolean(grants?.[featureId]?.includes(action));
}

function countMemberGranted(grants, catalog = PERM_CATALOG) {
  let n = 0;
  for (const row of catalog) {
    for (const act of row[3]) {
      if (memberHas(grants, row[2], act)) n += 1;
    }
  }
  return n;
}

function featureOnCount(grants, featureId, actions) {
  return actions.filter((a) => memberHas(grants, featureId, a)).length;
}

function toggleMemberGrant(grants, featureId, action, catalog = PERM_CATALOG) {
  const next =
    grants == null
      ? (() => {
          const all = {};
          for (const row of catalog) all[row[2]] = [...row[3]];
          return all;
        })()
      : cloneGrants({ m: grants }).m;

  const set = new Set(next[featureId] || []);
  if (set.has(action)) set.delete(action);
  else set.add(action);
  const allowed = catalog.find((r) => r[2] === featureId)?.[3] || [];
  const ordered = allowed.filter((a) => set.has(a));
  if (ordered.length) next[featureId] = ordered;
  else delete next[featureId];
  return next;
}

function applyChangeToGrants(grants, change, roleGrants, catalog = PERM_CATALOG) {
  if (change.reset) return roleGrants == null ? null : { ...roleGrants };

  let next = grants == null ? null : { ...grants };
  if (next == null) next = roleGrants == null ? null : { ...roleGrants };
  if (!next || !change.featureId) return next;

  const row = catalog.find((r) => r[2] === change.featureId);
  const allowed = row?.[3] || [];
  const set = new Set(next[change.featureId] || []);
  if (change.changeType === "grant") set.add(change.action);
  else if (change.changeType === "revoke") set.delete(change.action);
  const ordered = allowed.filter((a) => set.has(a));
  if (ordered.length) next[change.featureId] = ordered;
  else delete next[change.featureId];
  return next;
}

function memberPendingRequests(member) {
  if (Array.isArray(member?.pendingPermissionRequests) && member.pendingPermissionRequests.length) {
    return member.pendingPermissionRequests.filter((req) => req.status === "pending");
  }
  if (member?.pendingPermissionRequest?.status === "pending") {
    return [member.pendingPermissionRequest];
  }
  return [];
}

function editorGrants(member, usePending, catalog = PERM_CATALOG) {
  let grants = member?.grants == null ? null : { ...member.grants };
  if (!usePending) return grants;

  const pending = memberPendingRequests(member);
  for (const req of [...pending].reverse()) {
    grants = applyChangeToGrants(grants, req, member.roleGrants, catalog);
  }
  return grants;
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function formatProfileDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function memberLocation(member) {
  return [member.city, member.state, member.country].filter(Boolean).join(", ") || "—";
}

function memberPhone(member) {
  if (!member.phone) return "—";
  const prefix = member.phoneCountryCode ? `+${String(member.phoneCountryCode).replace(/^\+/, "")} ` : "";
  return `${prefix}${member.phone}`;
}

function ToggleSwitch({ on, disabled, onClick }) {
  return (
    <button
      type="button"
      className={`ua-ac-switch ua-ac-switch--${on ? "on" : "off"}${disabled ? " ua-ac-switch--disabled" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
    >
      <span className="ua-ac-switch__knob" />
    </button>
  );
}

function buildClientCards(member) {
  const total = member.clientStats?.total ?? member.clientCount ?? 0;
  const seek = member.clientStats?.seek ?? 0;
  const heal = member.clientStats?.heal ?? 0;
  const pwc = member.clientStats?.consultancy_only ?? 0;
  const other = member.clientStats?.other ?? 0;
  const awc = member.awcCount ?? 0;

  return [
    { key: "total", label: "Total users", value: String(total), sub: "All assigned", tone: "blue", bar: true },
    {
      key: "seek",
      label: "Seek users",
      value: total ? `${seek} (${pct(seek, total)}%)` : "0",
      sub: "Free tier",
      tone: "amber",
      bar: true,
    },
    {
      key: "heal",
      label: "Heal users",
      value: total ? `${heal} (${pct(heal, total)}%)` : "0",
      sub: "Paid programs",
      tone: "green",
      bar: true,
    },
    {
      key: "other",
      label: "Other",
      value: total ? `${other} (${pct(other, total)}%)` : "0",
      sub: "Corporate & family",
      tone: "purple",
      bar: true,
    },
    {
      key: "pwc",
      label: "PWC",
      value: total ? `${pwc} (${pct(pwc, total)}%)` : "0",
      sub: "Consults booked",
      tone: "navy",
      bar: true,
    },
    { key: "awc", label: "AWCs", value: String(awc), sub: "Assistant coaches", tone: "ink", bar: true },
  ];
}

export function TeamMemberPage() {
  const { memberId } = useParams();
  const [searchParams] = useSearchParams();
  const { showToast: onToast } = useOutletContext();
  const { isSuperAdmin, viewAs } = useViewAs();
  const navigate = useNavigate();
  const permsRef = useRef(null);
  const requestsApproval = !isSuperAdmin && viewAs === "wc";

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleDraft, setRoleDraft] = useState("wc");
  const [savingRole, setSavingRole] = useState(false);
  const [grants, setGrants] = useState({});
  const [dirtyPerms, setDirtyPerms] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [accessRoles, setAccessRoles] = useState([]);
  const [catalogRows, setCatalogRows] = useState(PERM_CATALOG);
  const [permActs, setPermActs] = useState(PERM_ACTS);
  const [totalSlots, setTotalSlots] = useState(TOTAL_PERM_SLOTS);
  const catalogRef = useRef(PERM_CATALOG);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [m, roles, catalog] = await Promise.all([
        fetchTeamMember(memberId),
        fetchAccessRoles().catch(() => []),
        fetchAccessCatalog().catch(() => null),
      ]);
      if (!m?.id) throw new Error("Member not found");
      const rows = catalogRowsFromApi(catalog);
      catalogRef.current = rows;
      setCatalogRows(rows);
      setPermActs(Array.isArray(catalog?.actions) && catalog.actions.length ? catalog.actions : PERM_ACTS);
      setTotalSlots(Number(catalog?.totalSlots || m?.totalSlots) || TOTAL_PERM_SLOTS);
      setAccessRoles(Array.isArray(roles) ? roles : []);
      setMember(m);
      setRoleDraft(m.consoleRoleId || m.primaryRoleKey || "wc");
      setGrants(editorGrants(m, !isSuperAdmin && viewAs === "wc", rows));
      setDirtyPerms(false);
    } catch (err) {
      setError(err?.message || "Failed to load member");
    } finally {
      setLoading(false);
    }
  }, [memberId, isSuperAdmin, viewAs]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!member || searchParams.get("focus") !== "permissions") return;
    permsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [member, searchParams]);

  const teamRoles = useMemo(
    () =>
      (accessRoles || []).filter((role) => {
        const baseUiKey = resolveBaseUiRoleKey(role, accessRoles);
        return Boolean(baseUiKey);
      }),
    [accessRoles],
  );
  const activeRole =
    teamRoles.find((role) => role.id === member?.consoleRoleId) ||
    teamRoles.find((role) => role.roleKey === member?.primaryRoleKey) ||
    null;
  const activeBaseUiKey = resolveBaseUiRoleKey(activeRole, teamRoles) || member?.primaryRoleKey;
  const roleMeta = roleChipMeta(activeRole, activeBaseUiKey);
  const granted = countMemberGranted(grants, catalogRows);
  const avatarColor = STAFF_AVATARS[(member?.name?.length || 0) % STAFF_AVATARS.length];
  const canEditPerms =
    Boolean(member) &&
    !member.isSuperAdmin &&
    (isSuperAdmin || (requestsApproval && member.primaryRoleKey === "awc"));

  const matrixGroups = useMemo(() => {
    const groups = [];
    let cur = null;
    for (const row of catalogRows) {
      if (!cur || cur.label !== row[0]) {
        cur = { label: row[0], features: [] };
        groups.push(cur);
      }
      cur.features.push(row);
    }
    return groups;
  }, [catalogRows]);

  const clientCards = useMemo(() => (member ? buildClientCards(member) : []), [member]);

  async function handleSaveRole() {
    if (!member) return;
    const nextRole = roleOptions.find((role) => String(role.id || role.roleKey) === String(roleDraft));
    const currentRoleKey = String(member.consoleRoleId || member.primaryRoleKey || "");
    if (!nextRole || String(roleDraft) === currentRoleKey) return;
    setSavingRole(true);
    try {
      await setAccessMemberRole(member.id, {
        consoleRoleId: nextRole.id,
        roleKey: nextRole.roleKey,
      });
      onToast("Role updated");
      await load();
    } catch (err) {
      onToast(err?.message || "Role update failed");
    } finally {
      setSavingRole(false);
    }
  }

  function handleToggle(featureId, action) {
    if (!canEditPerms) return;
    setGrants((g) => toggleMemberGrant(g, featureId, action, catalogRef.current));
    setDirtyPerms(true);
  }

  async function handleSavePerms() {
    setSavingPerms(true);
    try {
      const updated = await saveTeamMemberPermissions(member.id, { grants });
      setMember(updated);
      setGrants(editorGrants(updated, requestsApproval, catalogRef.current));
      setDirtyPerms(false);
      onToast(
        requestsApproval && memberPendingRequests(updated).length
          ? `Sent ${memberPendingRequests(updated).length} request${
              memberPendingRequests(updated).length === 1 ? "" : "s"
            } to Admin`
          : "Permissions saved",
      );
    } catch (err) {
      onToast(err?.message || "Save failed");
    } finally {
      setSavingPerms(false);
    }
  }

  async function handleResetPerms() {
    setSavingPerms(true);
    try {
      const updated = await saveTeamMemberPermissions(member.id, { reset: true });
      setMember(updated);
      setGrants(editorGrants(updated, requestsApproval, catalogRef.current));
      setDirtyPerms(false);
      onToast(
        requestsApproval && memberPendingRequests(updated).length
          ? "Reset sent to Admin for approval"
          : "Reset to role default",
      );
    } catch (err) {
      onToast(err?.message || "Reset failed");
    } finally {
      setSavingPerms(false);
    }
  }

  if (loading) {
    return (
      <main className="content ua-page-enter">
        <p>Loading member…</p>
      </main>
    );
  }

  if (error || !member) {
    return (
      <main className="content ua-page-enter">
        <PageHeader title="Team member" backLink="Team" />
        <div className="ua-section-bar">
          <span>{error || "Not found"}</span>
          <OrangeButton onClick={() => navigate(UPDATED_ADMIN_PATHS.teams)}>Back</OrangeButton>
        </div>
      </main>
    );
  }

  const showClients = member.primaryRoleKey === "wc" || member.primaryRoleKey === "awc";
  const contentItems = Array.isArray(member.content) ? member.content : [];
  const contentLive = contentItems.filter((item) => item.live).length;
  const roleOptions = teamRoles.length
    ? teamRoles
    : SYSTEM_TEAM_ROLE_KEYS.map((id) => ({
        id,
        roleKey: id,
        name: TEAM_ROLE_META[id]?.name || id,
      }));

  return (
    <main className="content ua-page-enter ua-tm-page">
      <div className="ua-tm-top">
        <Link to={UPDATED_ADMIN_PATHS.teams} className="ua-back-link">
          ← Team
        </Link>
        <h1 className="page-head__title">Team member</h1>
      </div>

      <section className="ua-tm-card ua-tm-profile">
        <div className="ua-tm-profile__row">
          <div className="ua-tm-profile__identity">
            <span className="ua-tm-avatar" style={{ background: avatarColor }}>
              {member.profileImage ? <img src={member.profileImage} alt="" /> : staffInitials(member.name)}
            </span>
            <div className="ua-tm-profile__copy">
              <div className="ua-tm-profile__name-row">
                <h2 className="ua-tm-profile__name">{member.name}</h2>
                <span
                  className="ua-role-chip"
                  style={{
                    background: roleMeta.roleBg,
                    color: roleMeta.roleColor,
                    borderColor: roleMeta.roleBorder,
                  }}
                >
                  {roleMeta.name}
                </span>
                <span
                  className={`ua-status-pill${
                    member.displayStatus === "Pending" ? " ua-status-pill--amber" : " ua-status-pill--green"
                  }`}
                >
                  {member.displayStatus}
                </span>
              </div>
              <div className="ua-tm-profile__meta">
                {member.email}
                {member.meta ? <span> · {member.meta}</span> : null}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="ua-tm-profile__view"
            onClick={() => setProfileOpen((open) => !open)}
            aria-expanded={profileOpen}
          >
            {profileOpen ? "Hide profile" : "View profile"}{" "}
            <span className={profileOpen ? "ua-tm-profile__chevron ua-tm-profile__chevron--open" : "ua-tm-profile__chevron"} aria-hidden="true">›</span>
          </button>
        </div>

        <div className="ua-tm-role-change">
          <div className="ua-tm-role-change__label">Role change</div>
          <div className="ua-tm-role-change__controls">
            <select
              className="ua-tm-role-change__select"
              value={roleDraft}
              disabled={member.isSuperAdmin || savingRole || requestsApproval}
              onChange={(e) => setRoleDraft(e.target.value)}
            >
              {roleOptions.map((role) => (
                <option key={role.id || role.roleKey} value={role.id || role.roleKey}>
                  {role.name}
                  {(role.id && role.id === member.consoleRoleId) ||
                  (!member.consoleRoleId && role.roleKey === member.primaryRoleKey)
                    ? " (current)"
                    : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="ua-tm-role-change__save"
              disabled={
                member.isSuperAdmin ||
                savingRole ||
                requestsApproval ||
                String(roleDraft) === String(member.consoleRoleId || member.primaryRoleKey || "")
              }
              onClick={handleSaveRole}
            >
              {savingRole ? "Saving…" : "Save"}
            </button>
          </div>
          <p className="ua-tm-role-change__hint">
            {requestsApproval
              ? "Role changes are applied by Admin. Permission grants for an AWC go to Access Control for approval."
              : `Admin — applies at once. Current role: ${roleMeta.name}`}
          </p>
        </div>

        {profileOpen ? (
          <div className="ua-tm-profile-details">
            <div className="ua-tm-profile-panel">
              <div className="ua-tm-profile-panel__title">Personal details</div>
              <dl className="ua-tm-profile-panel__rows">
                <div><dt>Full name</dt><dd>{member.name || "—"}</dd></div>
                <div><dt>Email</dt><dd>{member.email || "—"}</dd></div>
                <div><dt>Mobile</dt><dd>{memberPhone(member)}</dd></div>
                <div><dt>Date of birth</dt><dd>{formatProfileDate(member.dateOfBirth)}</dd></div>
                <div><dt>Location</dt><dd>{memberLocation(member)}</dd></div>
              </dl>
            </div>
            <div className="ua-tm-profile-panel">
              <div className="ua-tm-profile-panel__title">Role &amp; engagement</div>
              <dl className="ua-tm-profile-panel__rows">
                <div><dt>Role</dt><dd>{roleMeta.name}</dd></div>
                <div><dt>Status</dt><dd>{member.displayStatus || "—"}</dd></div>
                <div><dt>Detail</dt><dd>{member.meta || "—"}</dd></div>
                <div><dt>Joined</dt><dd>{formatProfileDate(member.joinedAt)}</dd></div>
                <div><dt>Referral code</dt><dd>{member.referralCode || "—"}</dd></div>
              </dl>
            </div>
          </div>
        ) : null}
      </section>

      {showClients ? (
        <section className="ua-tm-card">
          <div className="ua-tm-section-head">
            <div className="ua-tm-section-head__title">Clients & team</div>
            <div className="ua-tm-section-head__hint">
              {member.clientCount ?? 0} clients assigned — tap a card to view them
            </div>
          </div>
          <div className="ua-tm-stat-grid">
            {clientCards.map((card) => (
              <button
                key={card.key}
                type="button"
                className={`ua-tm-stat ua-tm-stat--${card.tone}`}
                onClick={() =>
                  navigate(`${UPDATED_ADMIN_PATHS.users}?coach=${encodeURIComponent(member.id)}`)
                }
              >
                <div className="ua-tm-stat__label">{card.label}</div>
                <div className="ua-tm-stat__value">{card.value}</div>
                <div className="ua-tm-stat__sub">{card.sub}</div>
                {card.bar ? <span className="ua-tm-stat__bar" aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {showClients && contentItems.length ? (
        <section className="ua-tm-card">
          <div className="ua-tm-section-head">
            <div className="ua-tm-section-head__title">Content</div>
            <div className="ua-tm-section-head__hint">
              {contentLive} of {contentItems.length} live for clients
            </div>
          </div>
          <div className="ua-tm-content-list">
            {contentItems.map((item) => (
              <div key={item.id} className="ua-tm-content-row">
                <div
                  className={`ua-tm-content-row__icon${item.kind === "letter" ? " ua-tm-content-row__icon--doc" : ""}`}
                  aria-hidden="true"
                >
                  {item.kind === "letter" ? "▤" : "▶"}
                </div>
                <div className="ua-tm-content-row__body">
                  <div className="ua-tm-content-row__title">{item.title}</div>
                  <div className="ua-tm-content-row__meta">{item.meta || "Not uploaded"}</div>
                </div>
                <span className={`ua-tm-content-row__live${item.live ? "" : " ua-tm-content-row__live--off"}`}>
                  {item.live ? "Live in app" : "Not uploaded"}
                </span>
                <div className="ua-tm-content-row__actions">
                  <button
                    type="button"
                    className="ua-soft-btn"
                    onClick={() => {
                      if (item.kind === "letter") {
                        navigate(UPDATED_ADMIN_PATHS.commitmentLetters(member.id));
                        return;
                      }
                      navigate(UPDATED_ADMIN_PATHS.myContent);
                    }}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="ua-soft-btn"
                    disabled={!item.url}
                    onClick={() => {
                      if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section ref={permsRef} className="ua-tm-card ua-tm-perms">
        <div className="ua-tm-section-head ua-tm-section-head--perms">
          <div>
            <div className="ua-tm-section-head__title">Permissions</div>
            <div className="ua-tm-section-head__hint">
              {granted} of {member.totalSlots || totalSlots} granted
              {member.hasOverrides ? " · personal override" : ""}
            </div>
          </div>
          <div className="ua-tm-perms__actions">
            <button type="button" className="ua-ac-btn-ghost" onClick={handleResetPerms} disabled={savingPerms || !canEditPerms}>
              Reset to default
            </button>
            <button
              type="button"
              className={`ua-tm-perms__save${dirtyPerms ? " ua-tm-perms__save--dirty" : ""}`}
              onClick={handleSavePerms}
              disabled={!canEditPerms || !dirtyPerms || savingPerms}
            >
              {savingPerms
                ? requestsApproval
                  ? "Sending…"
                  : "Saving…"
                : dirtyPerms
                  ? requestsApproval
                    ? "Request approval"
                    : "Save"
                  : "Saved"}
            </button>
          </div>
        </div>
        <p className="ua-tm-perms__intro">
          {requestsApproval
            ? "Toggle what this assistant can do, then send the request. Admin approval on Access Control grants the permission."
            : "Toggle what this member can do, then save. Reset puts every row back to the role default."}
        </p>
        {memberPendingRequests(member).length ? (
          <div className="ua-tm-pending">
            <div className="ua-tm-pending__title">
              Waiting for Admin approval ({memberPendingRequests(member).length})
            </div>
            {memberPendingRequests(member).map((req) => (
              <div key={req.id} className="ua-tm-pending__item">
                <div className="ua-tm-pending__meta">{req.title}</div>
                <div className="ua-tm-pending__meta">{req.meta}</div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="ua-ac-matrix__scroll">
          <div className="ua-ac-matrix__cols">
            <div className="ua-ac-matrix__col-label">Feature</div>
            {permActs.map((a) => (
              <div key={a} className="ua-ac-matrix__col-act">
                {a}
              </div>
            ))}
            <div className="ua-ac-matrix__col-granted">On</div>
          </div>
          {matrixGroups.map((group) => (
            <div key={group.label} className="ua-ac-matrix__group">
              <div className="ua-ac-matrix__group-label">{group.label}</div>
              {group.features.map((row) => {
                const [, name, fid, acts] = row;
                const onCount = featureOnCount(grants, fid, acts);
                return (
                  <div key={fid} className="ua-ac-matrix__row">
                    <div className="ua-ac-matrix__perm">
                      <span className="ua-ac-matrix__perm-name">{name}</span>
                    </div>
                    {permActs.map((act) => {
                      const applicable = acts.includes(act);
                      if (!applicable) {
                        return (
                          <div key={act} className="ua-ac-matrix__cell">
                            <span className="ua-ac-dash">—</span>
                          </div>
                        );
                      }
                      return (
                        <div key={act} className="ua-ac-matrix__cell">
                          <ToggleSwitch
                            on={memberHas(grants, fid, act)}
                            disabled={!canEditPerms}
                            onClick={() => handleToggle(fid, act)}
                          />
                        </div>
                      );
                    })}
                    <div className="ua-ac-matrix__granted">
                      <span className={`ua-ac-granted-pill${onCount > 0 ? " ua-ac-granted-pill--on" : ""}`}>
                        {onCount}/{acts.length}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
