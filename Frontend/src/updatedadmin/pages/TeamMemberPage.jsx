import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { OrangeButton, PageHeader } from "../components/shared.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { STAFF_AVATARS, TEAM_ROLE_META, TEAM_ROLE_TABS_BASE, staffInitials } from "../data/teamsData.js";
import {
  PERM_ACTS,
  PERM_CATALOG,
  TOTAL_PERM_SLOTS,
  cloneGrants,
} from "../data/accessData.js";
import {
  fetchTeamMember,
  saveTeamMemberPermissions,
  setAccessMemberRole,
} from "../api/teamsApi.js";

function memberHas(grants, featureId, action) {
  if (grants == null) return true;
  return Boolean(grants?.[featureId]?.includes(action));
}

function countMemberGranted(grants) {
  let n = 0;
  for (const row of PERM_CATALOG) {
    for (const act of row[3]) {
      if (memberHas(grants, row[2], act)) n += 1;
    }
  }
  return n;
}

function featureOnCount(grants, featureId, actions) {
  return actions.filter((a) => memberHas(grants, featureId, a)).length;
}

function toggleMemberGrant(grants, featureId, action) {
  const next =
    grants == null
      ? (() => {
          const all = {};
          for (const row of PERM_CATALOG) all[row[2]] = [...row[3]];
          return all;
        })()
      : cloneGrants({ m: grants }).m;

  const set = new Set(next[featureId] || []);
  if (set.has(action)) set.delete(action);
  else set.add(action);
  const allowed = PERM_CATALOG.find((r) => r[2] === featureId)?.[3] || [];
  const ordered = allowed.filter((a) => set.has(a));
  if (ordered.length) next[featureId] = ordered;
  else delete next[featureId];
  return next;
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
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
  const navigate = useNavigate();
  const permsRef = useRef(null);

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleDraft, setRoleDraft] = useState("wc");
  const [savingRole, setSavingRole] = useState(false);
  const [grants, setGrants] = useState({});
  const [dirtyPerms, setDirtyPerms] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const m = await fetchTeamMember(memberId);
      setMember(m);
      setRoleDraft(m.primaryRoleKey || "wc");
      setGrants(m.grants == null ? null : { ...m.grants });
      setDirtyPerms(false);
    } catch (err) {
      setError(err?.message || "Failed to load member");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!member || searchParams.get("focus") !== "permissions") return;
    permsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [member, searchParams]);

  const roleMeta = TEAM_ROLE_META[member?.primaryRoleKey] || TEAM_ROLE_META.wc;
  const granted = countMemberGranted(grants);
  const avatarColor = STAFF_AVATARS[(member?.name?.length || 0) % STAFF_AVATARS.length];

  const matrixGroups = useMemo(() => {
    const groups = [];
    let cur = null;
    for (const row of PERM_CATALOG) {
      if (!cur || cur.label !== row[0]) {
        cur = { label: row[0], features: [] };
        groups.push(cur);
      }
      cur.features.push(row);
    }
    return groups;
  }, []);

  const clientCards = useMemo(() => (member ? buildClientCards(member) : []), [member]);

  async function handleSaveRole() {
    if (!member || roleDraft === member.primaryRoleKey) return;
    setSavingRole(true);
    try {
      await setAccessMemberRole(member.id, roleDraft);
      onToast("Role updated");
      await load();
    } catch (err) {
      onToast(err?.message || "Role update failed");
    } finally {
      setSavingRole(false);
    }
  }

  function handleToggle(featureId, action) {
    if (member?.isSuperAdmin) return;
    setGrants((g) => toggleMemberGrant(g, featureId, action));
    setDirtyPerms(true);
  }

  async function handleSavePerms() {
    setSavingPerms(true);
    try {
      const updated = await saveTeamMemberPermissions(member.id, { grants });
      setMember(updated);
      setGrants(updated.grants == null ? null : { ...updated.grants });
      setDirtyPerms(false);
      onToast("Permissions saved");
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
      setGrants(updated.grants == null ? null : { ...updated.grants });
      setDirtyPerms(false);
      onToast("Reset to role default");
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
  const contentLive = member.primaryRoleKey === "wc" ? 2 : 0;

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
              {staffInitials(member.name)}
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
            onClick={() => onToast("Profile editor coming soon")}
          >
            View profile <span aria-hidden="true">›</span>
          </button>
        </div>

        <div className="ua-tm-role-change">
          <div className="ua-tm-role-change__label">Role change</div>
          <div className="ua-tm-role-change__controls">
            <select
              className="ua-tm-role-change__select"
              value={roleDraft}
              disabled={member.isSuperAdmin || savingRole}
              onChange={(e) => setRoleDraft(e.target.value)}
            >
              {TEAM_ROLE_TABS_BASE.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                  {t.id === member.primaryRoleKey ? " (current)" : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="ua-tm-role-change__save"
              disabled={member.isSuperAdmin || savingRole || roleDraft === member.primaryRoleKey}
              onClick={handleSaveRole}
            >
              {savingRole ? "Saving…" : "Save"}
            </button>
          </div>
          <p className="ua-tm-role-change__hint">
            Admin — applies at once. Current role: {roleMeta.name}
          </p>
        </div>
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

      {(member.primaryRoleKey === "wc" || member.primaryRoleKey === "awc") && (
        <section className="ua-tm-card">
          <div className="ua-tm-section-head">
            <div className="ua-tm-section-head__title">Content</div>
            <div className="ua-tm-section-head__hint">
              {contentLive} of 2 live for clients
            </div>
          </div>
          <div className="ua-tm-content-list">
            <div className="ua-tm-content-row">
              <div className="ua-tm-content-row__icon" aria-hidden="true">
                ▶
              </div>
              <div className="ua-tm-content-row__body">
                <div className="ua-tm-content-row__title">Intro video</div>
                <div className="ua-tm-content-row__meta">Upload from My content</div>
              </div>
              <span className="ua-tm-content-row__live">Live in app</span>
              <div className="ua-tm-content-row__actions">
                <button type="button" className="ua-soft-btn" onClick={() => navigate(UPDATED_ADMIN_PATHS.myContent)}>
                  View
                </button>
                <button type="button" className="ua-soft-btn" onClick={() => onToast("Open My content to manage media")}>
                  Download
                </button>
              </div>
            </div>
            <div className="ua-tm-content-row">
              <div className="ua-tm-content-row__icon ua-tm-content-row__icon--doc" aria-hidden="true">
                ▤
              </div>
              <div className="ua-tm-content-row__body">
                <div className="ua-tm-content-row__title">Commitment letter</div>
                <div className="ua-tm-content-row__meta">PDF · managed per coach</div>
              </div>
              <span className="ua-tm-content-row__live">Live in app</span>
              <div className="ua-tm-content-row__actions">
                <button
                  type="button"
                  className="ua-soft-btn"
                  onClick={() => navigate(UPDATED_ADMIN_PATHS.commitmentLetters(member.id))}
                >
                  View
                </button>
                <button type="button" className="ua-soft-btn" onClick={() => onToast("Open letters to download")}>
                  Download
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section ref={permsRef} className="ua-tm-card ua-tm-perms">
        <div className="ua-tm-section-head ua-tm-section-head--perms">
          <div>
            <div className="ua-tm-section-head__title">Permissions</div>
            <div className="ua-tm-section-head__hint">
              {granted} of {TOTAL_PERM_SLOTS} granted
              {member.hasOverrides ? " · personal override" : ""}
            </div>
          </div>
          <div className="ua-tm-perms__actions">
            <button type="button" className="ua-ac-btn-ghost" onClick={handleResetPerms} disabled={savingPerms}>
              Reset to default
            </button>
            <button
              type="button"
              className={`ua-tm-perms__save${dirtyPerms ? " ua-tm-perms__save--dirty" : ""}`}
              onClick={handleSavePerms}
              disabled={!dirtyPerms || savingPerms}
            >
              {savingPerms ? "Saving…" : dirtyPerms ? "Save" : "Saved"}
            </button>
          </div>
        </div>
        <p className="ua-tm-perms__intro">
          Toggle what this member can do, then save. Reset puts every row back to the role default.
        </p>

        <div className="ua-ac-matrix__scroll">
          <div className="ua-ac-matrix__cols">
            <div className="ua-ac-matrix__col-label">Feature</div>
            {PERM_ACTS.map((a) => (
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
                    {PERM_ACTS.map((act) => {
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
                            disabled={member.isSuperAdmin}
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
