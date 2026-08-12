import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { OrangeButton, PageHeader, PillTabs, TableScroll } from "../components/shared.jsx";
import {
  ACCESS_TABS,
  ACTION_COLS,
  APPROVALS,
  AUDIT_LOG,
  MATRIX_FEATURES,
  POLICIES,
  ROLES,
  SIMULATOR_ROWS,
  cellVisual,
} from "../data/accessData.js";

export function AccessPage() {
  const { showToast: onToast } = useOutletContext();
  const [tab, setTab] = useState("roles");
  const [selectedRole, setSelectedRole] = useState("admin");
  const [scope, setScope] = useState("All");
  const role = ROLES.find((r) => r.id === selectedRole) ?? ROLES[0];

  return (
    <main className="content ua-page-enter">
      <PageHeader
        title="Access Control"
        subtitle={<>Hybrid RBAC — role baselines plus attachable policies. Precedence: <b style={{ color: "#d64545" }}>deny</b> › <b style={{ color: "#2b8f5b" }}>allow</b> › role default.</>}
        autosave
        onAutosave={() => onToast("Saved")}
      />

      <PillTabs tabs={ACCESS_TABS} active={tab} onChange={setTab} size="lg" />

      {tab === "roles" ? (
        <div className="ua-access-grid">
          <div className="ua-role-list">
            <div className="ua-role-list__head">
              <span>Roles</span>
              <button type="button" className="ua-link-btn" onClick={() => onToast("Create role")}>+ Create</button>
            </div>
            {ROLES.map((r) => (
              <button key={r.id} type="button" className={`ua-role-item${selectedRole === r.id ? " ua-role-item--active" : ""}`} onClick={() => { setSelectedRole(r.id); setScope(r.scope); }}>
                <span className="ua-role-item__dot" style={{ background: r.color }} />
                <span>
                  <div className="ua-role-item__name">{r.name}</div>
                  <div className="ua-role-item__meta">{r.userCount} users · {r.scope}</div>
                </span>
              </button>
            ))}
          </div>

          <div className="ua-matrix-card">
            <div className="ua-matrix-card__head">
              <div>
                <div className="ua-matrix-card__title"><span className="ua-role-badge" style={{ background: role.color }}>{role.name}</span> permission editor</div>
                <div className="ua-matrix-card__desc">{role.id === "admin" ? "Full read/write across every section. Manages roles, policies and data-point visibility." : "Role baseline permissions with attachable policy overrides."}</div>
              </div>
              <div className="ua-scope-toggle">
                <span>Data scope</span>
                {["All", "Team", "Assigned"].map((s) => (
                  <button key={s} type="button" className={`ua-scope-toggle__btn${scope === s ? " ua-scope-toggle__btn--active" : ""}`} onClick={() => setScope(s)}>{s}</button>
                ))}
              </div>
            </div>
            <div className="ua-matrix-legend">
              <span><i className="ua-cell ua-cell--allow" /> Allow</span>
              <span><i className="ua-cell ua-cell--deny" /> Deny</span>
              <span><i className="ua-cell ua-cell--inherit" /> Inherit (role default)</span>
              <span className="ua-matrix-legend__hint">Click any cell to cycle · expand a feature to set field-level visibility</span>
            </div>
            <div className="ua-matrix-scroll">
              <div className="ua-matrix ua-matrix__head">
                <div>Feature / data point</div>
                {ACTION_COLS.map((a) => <div key={a}>{a}</div>)}
              </div>
              {MATRIX_FEATURES.map((row) => (
                <div key={row.id} className="ua-matrix ua-matrix__row">
                  <div className="ua-matrix__feature">
                    <span className="ua-matrix__name">{row.name}</span>
                    <span className="ua-matrix__section">{row.section}</span>
                  </div>
                  {row.cells.map((state, idx) => {
                    const v = cellVisual(state);
                    return (
                      <button key={ACTION_COLS[idx]} type="button" className="ua-matrix__cell" style={{ background: v.bg, borderColor: v.border, color: v.color }} onClick={() => onToast(`Toggled ${row.name} · ${ACTION_COLS[idx]}`)}>
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
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
                  <div><div className="ua-policy-card__name">{p.name}</div><div className="ua-policy-card__desc">{p.desc}</div></div>
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
                  <span>Attached to <b>{p.attachedCount}</b></span>
                  <div><button type="button" className="ua-soft-btn" onClick={() => onToast("Edit policy")}>Edit</button><button type="button" className="ua-green-btn" onClick={() => onToast("Attach policy")}>Attach</button></div>
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
            <select className="header__select" defaultValue="awc"><option value="admin">Admin</option><option value="wc">Wellness Coach</option><option value="awc">Assistant WC</option><option value="support">Support</option></select>
            <span className="chip chip--global">scope: Team</span>
          </div>
          {SIMULATOR_ROWS.map((row) => (
            <div key={row.feature} className="ua-sim-row">
              <span className={`ua-sim-row__icon${row.verdict === "Visible" ? " ua-sim-row__icon--ok" : ""}`}>{row.verdict === "Visible" ? "👁" : "🔒"}</span>
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
              <div><div className="ua-approval-card__title">{a.title}</div><div className="ua-approval-card__meta">{a.meta}</div></div>
              <div className="ua-approval-card__actions">
                <button type="button" className="ua-reject-btn" onClick={() => onToast("Rejected")}>Reject</button>
                <button type="button" className="ua-green-btn" onClick={() => onToast("Approved")}>Approve</button>
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
              <svg className="ua-search-wrap__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              <input className="ua-search-wrap__input" placeholder="Search name, user ID, phone, coach or event" />
            </div>
            <select className="header__select"><option>All types</option><option>Role changes</option><option>Permission changes</option><option>Activity</option></select>
            <span className="ua-table__muted">{AUDIT_LOG.length} entries</span>
          </div>
          <TableScroll>
          <div className="ua-table-card">
            <div className="ua-table ua-table--audit ua-table__head">
              <div>Type</div><div>Event</div><div>Subject</div><div>Actor</div><div>When</div>
            </div>
            {AUDIT_LOG.map((l) => (
              <div key={l.text} className="ua-table ua-table--audit ua-table__row">
                <div><span className={`ua-log-kind ua-log-kind--${l.kind.toLowerCase()}`}>{l.kind}</span></div>
                <div><div className="ua-log-text">{l.text}</div><div className="ua-log-detail">{l.detail}</div></div>
                <div><div>{l.subject}</div><div className="ua-table__muted">{l.subjectMeta}</div></div>
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
