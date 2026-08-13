import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { OrangeButton, PageHeader, PillTabs, TableScroll } from "../components/shared.jsx";
import {
  ACCESS_TABS,
  AC_SECTIONS,
  APPROVALS,
  AUDIT_LOG,
  DEFAULT_GRANTS,
  DEFAULT_PARENTS,
  DEFAULT_VIEWS,
  MEMBERS,
  PERM_ACTS,
  PERM_CATALOG,
  POLICIES,
  ROLE_META,
  ROLE_ORDER,
  SIMULATOR_ROWS,
  TOTAL_PERM_SLOTS,
  cellKind,
  cloneGrants,
  copyRoleGrants,
  countGranted,
  featureGrantedCount,
  sectionStats,
  toggleGrant,
  vsParentDelta,
} from "../data/accessData.js";

function ToggleSwitch({ kind, onClick, disabled }) {
  if (kind === "na") return <span className="ua-ac-dash">—</span>;
  return (
    <button
      type="button"
      className={`ua-ac-switch ua-ac-switch--${kind}${disabled ? " ua-ac-switch--disabled" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={kind === "on" || kind === "added" || kind === "inherited"}
    >
      <span className="ua-ac-switch__knob" />
    </button>
  );
}

function CreateRoleModal({ roles, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [inheritFrom, setInheritFrom] = useState("");

  return (
    <div className="ua-dialog-backdrop" onClick={onClose} role="presentation">
      <div className="ua-ac-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ua-ac-modal__title">Create a role</div>
        <p className="ua-ac-modal__body">
          A new role can inherit everything from an existing one, then add or remove permissions on top.
          Later changes to the parent flow through automatically.
        </p>
        <label className="ua-ac-field">
          <span className="ua-ac-field__label">Role name</span>
          <input
            className="ua-ac-field__input"
            placeholder="Role name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <label className="ua-ac-field">
          <span className="ua-ac-field__label">Start from</span>
          <select
            className="ua-ac-field__input"
            value={inheritFrom}
            onChange={(e) => setInheritFrom(e.target.value)}
          >
            <option value="">Nothing — start from zero</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                Inherit from {r.name}
              </option>
            ))}
          </select>
        </label>
        <div className="ua-ac-modal__actions">
          <button type="button" className="btn btn--outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ua-ac-modal__primary"
            disabled={!name.trim()}
            onClick={() => onCreate({ name: name.trim(), inheritFrom: inheritFrom || null })}
          >
            Create role
          </button>
        </div>
      </div>
    </div>
  );
}

function RolesPermissionsTab({ onToast }) {
  const [selectedRole, setSelectedRole] = useState("admin");
  const [grants, setGrants] = useState(() => cloneGrants());
  const [parents, setParents] = useState(() => ({ ...DEFAULT_PARENTS }));
  const [views, setViews] = useState(() => ({
    admin: [...DEFAULT_VIEWS.admin],
    wc: [...DEFAULT_VIEWS.wc],
    awc: [...DEFAULT_VIEWS.awc],
    trainee: [...DEFAULT_VIEWS.trainee],
    support: [...DEFAULT_VIEWS.support],
  }));
  const [customRoles, setCustomRoles] = useState([]);
  const [scope, setScope] = useState("All");
  const [activeSection, setActiveSection] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const roleList = useMemo(() => {
    const base = ROLE_ORDER.map((id) => ROLE_META[id]);
    return [...base, ...customRoles];
  }, [customRoles]);

  const role = roleList.find((r) => r.id === selectedRole) || roleList[0];

  const granted = countGranted(grants, parents, role.id);
  const delta = vsParentDelta(grants, parents, role.id);
  const sections = sectionStats(grants, parents, role.id, views);
  const openSections = sections.filter((s) => s.open).length;
  const parentMeta = parents[role.id] ? ROLE_META[parents[role.id]] || roleList.find((r) => r.id === parents[role.id]) : null;

  const matrixRows = useMemo(() => {
    const rows = activeSection
      ? PERM_CATALOG.filter((r) => r[4] === activeSection)
      : PERM_CATALOG;
    const groups = [];
    let cur = null;
    for (const row of rows) {
      if (!cur || cur.label !== row[0]) {
        cur = { label: row[0], sectionId: row[4], features: [] };
        groups.push(cur);
      }
      cur.features.push(row);
    }
    return groups;
  }, [activeSection]);

  function selectRole(id) {
    setSelectedRole(id);
    const meta = roleList.find((r) => r.id === id);
    if (meta?.scope) setScope(meta.scope);
    setActiveSection(null);
  }

  function handleToggle(featureId, action) {
    if (role.locked || role.id === "admin") {
      onToast("Admin permissions are locked");
      return;
    }
    setGrants((g) => toggleGrant(g, parents, role.id, featureId, action));
  }

  function handleParentChange(nextParent) {
    if (role.locked) return;
    setParents((p) => ({ ...p, [role.id]: nextParent || null }));
    if (nextParent) {
      setGrants((g) => {
        const next = cloneGrants(g);
        next[role.id] = copyRoleGrants(g, nextParent);
        return next;
      });
      setViews((v) => ({
        ...v,
        [role.id]: [...(v[nextParent] || DEFAULT_VIEWS[nextParent] || ["dashboard"])],
      }));
    }
    onToast(nextParent ? `Now inherits from ${ROLE_META[nextParent]?.name || nextParent}` : "Standalone role");
  }

  function toggleSectionNav(sectionId) {
    if (role.locked) {
      onToast("Admin sections are locked");
      return;
    }
    setViews((v) => {
      const cur = new Set(v[role.id] || []);
      if (cur.has(sectionId)) cur.delete(sectionId);
      else cur.add(sectionId);
      return { ...v, [role.id]: [...cur] };
    });
  }

  function resetRole() {
    if (role.locked) return;
    setGrants((g) => {
      const next = cloneGrants(g);
      next[role.id] = DEFAULT_GRANTS[role.id] == null
        ? null
        : cloneGrants({ [role.id]: DEFAULT_GRANTS[role.id] })[role.id];
      if (!(role.id in DEFAULT_GRANTS)) next[role.id] = {};
      return next;
    });
    setParents((p) => ({ ...p, [role.id]: DEFAULT_PARENTS[role.id] ?? null }));
    setViews((v) => ({
      ...v,
      [role.id]: [...(DEFAULT_VIEWS[role.id] || [])],
    }));
    onToast("Reset to default");
  }

  function handleCreateRole({ name, inheritFrom }) {
    const id = `custom-${Date.now()}`;
    const color = "#5e6ad2";
    setCustomRoles((list) => [
      ...list,
      {
        id,
        name,
        color,
        bg: "#eceefc",
        bd: "#dcdff7",
        scope: "Team",
        locked: false,
        system: false,
        memberCount: 0,
        desc: inheritFrom
          ? `Custom role inheriting from ${ROLE_META[inheritFrom]?.name || inheritFrom}.`
          : "Custom role starting from zero permissions.",
      },
    ]);
    setParents((p) => ({ ...p, [id]: inheritFrom }));
    setGrants((g) => ({
      ...g,
      [id]: inheritFrom ? copyRoleGrants(g, inheritFrom) : {},
    }));
    setViews((v) => ({
      ...v,
      [id]: inheritFrom ? [...(v[inheritFrom] || DEFAULT_VIEWS[inheritFrom] || [])] : ["dashboard"],
    }));
    setCreateOpen(false);
    setSelectedRole(id);
    onToast(`Created role “${name}”`);
  }

  return (
    <>
      <div className="ua-ac-roles-bar">
        <div className="ua-ac-roles-bar__head">
            <div className="ua-ac-roles-bar__label">Roles</div>
          <div className="ua-ac-roles-bar__actions">
            <p className="ua-ac-roles-bar__hint">
              Edits apply at once to every member holding the role, unless they carry a personal override.
            </p>
          <button type="button" className="ua-ac-btn-outline ua-ac-btn-outline--new" onClick={() => setCreateOpen(true)}>
            + New role
          </button>
          </div>
        </div>

        <div className="ua-ac-role-cards">
          {roleList.map((r) => {
            const g = countGranted(grants, parents, r.id);
            const active = selectedRole === r.id;
            const p = parents[r.id] ? ROLE_META[parents[r.id]] || roleList.find((x) => x.id === parents[r.id]) : null;
            return (
              <button
                key={r.id}
                type="button"
                className={`ua-ac-role-card${active ? " ua-ac-role-card--active" : ""}`}
                style={active ? { borderColor: r.color, background: r.bg } : undefined}
                onClick={() => selectRole(r.id)}
              >
                <div className="ua-ac-role-card__top">
                  <span className="ua-ac-role-card__dot" style={{ background: r.color }} />
                  <span className="ua-ac-role-card__name">{r.name}</span>
                  <span className="ua-ac-role-card__pill">{g}/{TOTAL_PERM_SLOTS}</span>
                </div>
                <div className="ua-ac-role-card__meta">
                  {r.memberCount} members · {r.scope}
                </div>
                {p ? (
                  <div className="ua-ac-role-card__inherit">↳ inherits {p.name}</div>
                ) : r.id === "admin" ? (
                  <div className="ua-ac-role-card__inherit ua-ac-role-card__inherit--muted">system · locked</div>
                ) : (
                  <div className="ua-ac-role-card__inherit ua-ac-role-card__inherit--muted">standalone</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ua-ac-role-detail">
        <div className="ua-ac-role-detail__head">
          <div className="ua-ac-role-detail__intro">
            <span className="ua-ac-role-chip" style={{ background: role.bg, color: role.color, borderColor: role.bd }}>
              {role.name}
            </span>
            {role.system ? <span className="ua-ac-tag">System role</span> : null}
            {role.locked ? <span className="ua-ac-tag ua-ac-tag--lock">Locked</span> : null}
            <p className="ua-ac-role-detail__desc">{role.desc}</p>
          </div>
          <div className="ua-ac-role-detail__controls">
              <div style={{ fontSize: "11.5px", color: "rgb(138, 151, 172)", fontWeight: "650" }} >Data scope</div>
            <div className="ua-ac-scope">
              {["All", "Team", "Assigned"].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`ua-ac-scope__btn${scope === s ? " ua-ac-scope__btn--active" : ""}`}
                  onClick={() => setScope(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <button type="button" className="ua-ac-btn-ghost" onClick={resetRole} disabled={role.locked}>
              Reset to default
            </button>
          </div>
        </div>

        <div className="ua-ac-inherit">
          <span className="ua-ac-inherit__label">Inherits from</span>
          <select
            className="ua-ac-inherit__select"
            value={parents[role.id] || ""}
            disabled={role.locked}
            onChange={(e) => handleParentChange(e.target.value)}
          >
            <option value="">Nothing — standalone</option>
            {roleList
              .filter((r) => r.id !== role.id)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  Inherit from {r.name}
                </option>
              ))}
          </select>
          <span className="ua-ac-inherit__hint">
            {parentMeta
              ? `Starts from every ${parentMeta.name} permission, then adds ${delta.added} and removes ${delta.removed}. Change ${parentMeta.name} and this role follows.`
              : role.id === "admin"
                ? "Admin is the root role — every permission is granted and locked."
                : "Standalone baseline. No parent permissions flow into this role."}
          </span>
        </div>

        <div className="ua-ac-stats">
          <div className="ua-ac-stat">
            <div className="ua-ac-stat__label">Members</div>
            <div className="ua-ac-stat__value">{role.memberCount}</div>
            <div className="ua-ac-stat__sub">on this baseline</div>
          </div>
          <div className="ua-ac-stat">
            <div className="ua-ac-stat__label">Permissions</div>
            <div className="ua-ac-stat__value">
              {granted} <span>/ {TOTAL_PERM_SLOTS}</span>
            </div>
            <div className="ua-ac-stat__sub">granted by this role</div>
          </div>
          <div className="ua-ac-stat">
            <div className="ua-ac-stat__label">{delta.standalone ? "Inheritance" : "Vs parent"}</div>
            <div className="ua-ac-stat__value">
              {delta.standalone ? "Standalone" : `+${delta.added} / −${delta.removed}`}
            </div>
            <div className="ua-ac-stat__sub">
              {delta.standalone ? "no parent role" : `on top of ${parentMeta?.name || "parent"}`}
            </div>
          </div>
          <div className="ua-ac-stat">
            <div className="ua-ac-stat__label">Sections</div>
            <div className="ua-ac-stat__value">
              {openSections} <span>/ {AC_SECTIONS.length}</span>
            </div>
            <div className="ua-ac-stat__sub">openable in the left nav</div>
          </div>
        </div>
      </div>

      <div className="ua-ac-split">
        <aside className="ua-ac-sections">
          <div className="ua-ac-sections__head">
            <div className="ua-ac-sections__title">Sections</div>
            <p className="ua-ac-sections__hint">
              Tap a section to filter the matrix. The tick opens or closes it in the left navigation.
            </p>
          </div>
          <button
            type="button"
            className={`ua-ac-section${activeSection == null ? " ua-ac-section--filter" : ""}`}
            onClick={() => setActiveSection(null)}
          >
            <span className="ua-ac-section__name">All sections</span>
            <span className="ua-ac-section__count">
              {granted}/{TOTAL_PERM_SLOTS}
            </span>
          </button>
          {sections.map((sec) => (
            <div key={sec.id} className={`ua-ac-section${activeSection === sec.id ? " ua-ac-section--filter" : ""}${sec.open ? " ua-ac-section--open" : ""}`}>
              <button type="button" className="ua-ac-section__main" onClick={() => setActiveSection(sec.id)}>
                <span className="ua-ac-section__name">{sec.label}</span>
                <span className="ua-ac-section__count">
                  {sec.granted}/{sec.total}
                </span>
              </button>
              <button
                type="button"
                className={`ua-ac-section__tick${sec.open ? " ua-ac-section__tick--on" : ""}`}
                title={sec.open ? "Hide from nav" : "Show in nav"}
                onClick={() => toggleSectionNav(sec.id)}
              >
                {sec.open ? "✓" : "×"}
              </button>
            </div>
          ))}
        </aside>

        <div className="ua-ac-matrix">
          <div className="ua-ac-matrix__head">
            <div>
              <div className="ua-ac-matrix__title">Permission baseline</div>
              <p className="ua-ac-matrix__hint">Tap a toggle to grant or revoke. Dashes mean the action does not apply.</p>
            </div>
            <div className="ua-ac-legend">
              <span><i className="ua-ac-legend__swatch ua-ac-legend__swatch--inherited" /> Inherited</span>
              <span><i className="ua-ac-legend__swatch ua-ac-legend__swatch--added" /> Added here</span>
              <span><i className="ua-ac-legend__swatch ua-ac-legend__swatch--removed" /> Removed here</span>
            </div>
          </div>

          <div className="ua-ac-matrix__scroll">
            <div className="ua-ac-matrix__cols">
              <div className="ua-ac-matrix__col-label">Permission</div>
              {PERM_ACTS.map((a) => (
                <div key={a} className="ua-ac-matrix__col-act">
                  {a}
                </div>
              ))}
              <div className="ua-ac-matrix__col-granted">Granted</div>
            </div>

            {matrixRows.map((group) => (
              <div key={group.label} className="ua-ac-matrix__group">
                <div className="ua-ac-matrix__group-label">{group.label}</div>
                {group.features.map((row) => {
                  const [, name, fid, acts] = row;
                  const gCount = featureGrantedCount(grants, parents, role.id, fid, acts);
                  return (
                    <div key={fid} className="ua-ac-matrix__row">
                      <div className="ua-ac-matrix__perm">
                        <span className="ua-ac-matrix__perm-name">{name}</span>
                        {gCount === 0 ? <span className="ua-ac-matrix__none">None</span> : null}
                        {gCount === acts.length && gCount > 0 ? <span className="ua-ac-matrix__all">All</span> : null}
                      </div>
                      {PERM_ACTS.map((act) => {
                        const applicable = acts.includes(act);
                        const kind = cellKind(grants, parents, role.id, fid, act, applicable);
                        return (
                          <div key={act} className="ua-ac-matrix__cell">
                            <ToggleSwitch
                              kind={kind}
                              disabled={role.locked}
                              onClick={() => handleToggle(fid, act)}
                            />
                          </div>
                        );
                      })}
                      <div className="ua-ac-matrix__granted">
                        <span className={`ua-ac-granted-pill${gCount > 0 ? " ua-ac-granted-pill--on" : ""}`}>
                          {gCount}/{acts.length}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {createOpen ? (
        <CreateRoleModal
          roles={roleList}
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreateRole}
        />
      ) : null}
    </>
  );
}

export function AccessPage() {
  const { showToast: onToast } = useOutletContext();
  const [tab, setTab] = useState("roles");

  return (
    <main className="content ua-page-enter ua-ac-page">
      <PageHeader
        title="Access Control"
        subtitle={
          <>
            Role baselines, per-user overrides and attachable policies. Precedence:{" "}
            <b style={{ color: "#d64545" }}>user override</b>
            {" > "}
            <b style={{ color: "#d64545" }}>policy deny</b>
            {" > "}
            <b style={{ color: "#2b8f5b" }}>policy allow</b>
            {" > "}
            role default.
          </>
        }
        autosave
        onAutosave={() => onToast("Saved")}
      />

      <PillTabs tabs={ACCESS_TABS} active={tab} onChange={setTab} size="lg" />

      {tab === "roles" ? <RolesPermissionsTab onToast={onToast} /> : null}

      {tab === "members" ? (
        <TableScroll>
          <div className="ua-table-card">
            <div className="ua-table ua-table--teams ua-table__head">
              <div>Name</div>
              <div>Role</div>
              <div>Meta</div>
              <div>Status</div>
            </div>
            {MEMBERS.map((m) => (
              <div key={m.email} className="ua-table ua-table--teams ua-table__row">
                <div>
                  <div className="ua-user-cell__name">{m.name}</div>
                  <div className="ua-user-cell__sub">{m.email}</div>
                </div>
                <div>
                  <span
                    className="ua-role-chip"
                    style={{
                      background: ROLE_META[m.role]?.bg,
                      color: ROLE_META[m.role]?.color,
                      borderColor: ROLE_META[m.role]?.bd,
                    }}
                  >
                    {ROLE_META[m.role]?.name || m.role}
                  </span>
                </div>
                <div className="ua-table__load">{m.meta}</div>
                <div>
                  <span className={`ua-status-pill${m.status === "Pending" ? " ua-status-pill--amber" : " ua-status-pill--green"}`}>
                    {m.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </TableScroll>
      ) : null}

      {tab === "policies" ? (
        <>
          <div className="ua-section-bar">
            <span>Reusable allow/deny grants. Attach to a role or an individual user.</span>
            <OrangeButton onClick={() => onToast("Create policy")}>+ Create policy</OrangeButton>
          </div>
          <div className="ua-policy-grid">
            {POLICIES.map((p) => (
              <div key={p.name} className="ua-policy-card">
                <div className="ua-policy-card__head">
                  <div>
                    <div className="ua-policy-card__name">{p.name}</div>
                    <div className="ua-policy-card__desc">{p.desc}</div>
                  </div>
                  <span className="ua-policy-card__scope">{p.scope}</span>
                </div>
                <div className="ua-policy-card__rules">
                  {p.rules.map((r) => (
                    <div key={r.text} className="ua-policy-card__rule">
                      <span className={`ua-rule-badge ua-rule-badge--${r.type.toLowerCase()}`}>{r.type}</span>
                      <span>{r.text}</span>
                    </div>
                  ))}
                </div>
                <div className="ua-policy-card__foot">
                  <span>
                    Attached to <b>{p.attachedCount}</b>
                  </span>
                  <div>
                    <button type="button" className="ua-soft-btn" onClick={() => onToast("Edit policy")}>
                      Edit
                    </button>
                    <button type="button" className="ua-green-btn" onClick={() => onToast("Attach policy")}>
                      Attach
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {tab === "simulator" ? (
        <div className="ua-sim-card">
          <div className="ua-sim-card__head">
            <strong>Previewing access as</strong>
            <select className="header__select" defaultValue="awc">
              <option value="admin">Admin</option>
              <option value="wc">Wellness Coach</option>
              <option value="awc">Assistant WC</option>
              <option value="trainee">Trainee</option>
              <option value="support">Support</option>
            </select>
            <span className="chip chip--global">scope: Team</span>
          </div>
          {SIMULATOR_ROWS.map((row) => (
            <div key={row.feature} className="ua-sim-row">
              <span className={`ua-sim-row__icon${row.verdict === "Visible" ? " ua-sim-row__icon--ok" : ""}`}>
                {row.verdict === "Visible" ? "👁" : "🔒"}
              </span>
              <div className="ua-sim-row__body">
                <div className="ua-sim-row__feature">{row.feature}</div>
                <div className="ua-sim-row__reason">{row.reason}</div>
              </div>
              <span className={`ua-sim-pill${row.verdict === "Visible" ? " ua-sim-pill--ok" : ""}`}>{row.verdict}</span>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "approvals" ? (
        <div className="ua-approvals">
          <p className="ua-page-head__sub">Permission and role requests raised by a Wellness Coach land here.</p>
          {APPROVALS.map((a) => (
            <div key={a.title} className="ua-approval-card">
              <span className="ua-approval-card__kind">{a.kind}</span>
              <div>
                <div className="ua-approval-card__title">{a.title}</div>
                <div className="ua-approval-card__meta">{a.meta}</div>
              </div>
              <div className="ua-approval-card__actions">
                <button type="button" className="ua-reject-btn" onClick={() => onToast("Rejected")}>
                  Reject
                </button>
                <button type="button" className="ua-green-btn" onClick={() => onToast("Approved")}>
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "audit" ? (
        <div className="ua-audit">
          <p className="ua-page-head__sub">Every access change and staff activity, newest first.</p>
          <div className="ua-search-row">
            <div className="ua-search-wrap ua-search-wrap--wide">
              <svg className="ua-search-wrap__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input className="ua-search-wrap__input" placeholder="Search name, user ID, phone, coach or event" />
            </div>
            <select className="header__select">
              <option>All types</option>
              <option>Role changes</option>
              <option>Permission changes</option>
              <option>Activity</option>
            </select>
            <span className="ua-table__muted">{AUDIT_LOG.length} entries</span>
          </div>
          <TableScroll>
            <div className="ua-table-card">
              <div className="ua-table ua-table--audit ua-table__head">
                <div>Type</div>
                <div>Event</div>
                <div>Subject</div>
                <div>Actor</div>
                <div>When</div>
              </div>
              {AUDIT_LOG.map((l) => (
                <div key={l.text} className="ua-table ua-table--audit ua-table__row">
                  <div>
                    <span className={`ua-log-kind ua-log-kind--${l.kind.toLowerCase()}`}>{l.kind}</span>
                  </div>
                  <div>
                    <div className="ua-log-text">{l.text}</div>
                    <div className="ua-log-detail">{l.detail}</div>
                  </div>
                  <div>
                    <div>{l.subject}</div>
                    <div className="ua-table__muted">{l.subjectMeta}</div>
                  </div>
                  <div>{l.actor}</div>
                  <div className="ua-table__muted">{l.when}</div>
                </div>
              ))}
            </div>
          </TableScroll>
        </div>
      ) : null}
    </main>
  );
}
