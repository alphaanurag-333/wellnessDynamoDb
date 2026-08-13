import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { OrangeButton, PageHeader, PillTabs, SectionLabel, TableScroll } from "../components/shared.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import {
  STAFF_AVATARS,
  STAFF_COL3,
  TEAM_ROLE_META,
  TEAM_ROLE_TABS_BASE,
  staffInitials,
} from "../data/teamsData.js";
import { createTeamMember, fetchTeamMembers, listCoachOptions } from "../api/teamsApi.js";

function CreateMemberModal({ open, coaches, onClose, onCreated, onToast }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState("wc");
  const [parentAccountId, setParentAccountId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setPhone("");
    setEmail("");
    setRoleKey("wc");
    setParentAccountId(coaches[0]?.id || "");
  }, [open, coaches]);

  if (!open) return null;

  const needsParent = roleKey === "awc" || roleKey === "trainee";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      onToast("Name and email are required");
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
        roleKey,
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
    <div className="ua-dialog-backdrop" onClick={onClose} role="presentation">
      <div className="ua-ac-modal" onClick={(ev) => ev.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ua-ac-modal__title">Create a team member</div>
        <p className="ua-ac-modal__body">Works for every role. A temporary password is set automatically.</p>
        <form onSubmit={handleSubmit}>
          <label className="ua-ac-field">
            <span className="ua-ac-field__label">Full name</span>
            <input className="ua-ac-field__input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </label>
          <label className="ua-ac-field">
            <span className="ua-ac-field__label">Mobile number</span>
            <input className="ua-ac-field__input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9000000000" />
          </label>
          <label className="ua-ac-field">
            <span className="ua-ac-field__label">Email address</span>
            <input className="ua-ac-field__input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="ua-ac-field">
            <span className="ua-ac-field__label">Role</span>
            <select className="ua-ac-field__input" value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
              {TEAM_ROLE_TABS_BASE.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          {needsParent ? (
            <label className="ua-ac-field">
              <span className="ua-ac-field__label">Reports to (Wellness Coach)</span>
              <select
                className="ua-ac-field__input"
                value={parentAccountId}
                onChange={(e) => setParentAccountId(e.target.value)}
                required
              >
                <option value="">Choose coach…</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.email}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="ua-ac-modal__actions">
            <button type="button" className="btn btn--outline" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="ua-ac-modal__primary" disabled={busy}>
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [coaches, setCoaches] = useState([]);

  const roleTab = searchParams.get("role") || "wc";
  const setRoleTab = (role) => {
    const next = new URLSearchParams(searchParams);
    if (role === "wc") next.delete("role");
    else next.set("role", role);
    setSearchParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { members: rows } = await fetchTeamMembers({ limit: 200 });
      setMembers(rows.filter((m) => !m.isSuperAdmin && m.primaryRoleKey !== "admin"));
    } catch (err) {
      setError(err?.message || "Failed to load team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!createOpen) return;
    listCoachOptions()
      .then(setCoaches)
      .catch(() => setCoaches([]));
  }, [createOpen]);

  const counts = useMemo(() => {
    const c = { wc: 0, awc: 0, support: 0, trainee: 0 };
    for (const m of members) {
      if (c[m.primaryRoleKey] != null) c[m.primaryRoleKey] += 1;
    }
    return c;
  }, [members]);

  const tabs = useMemo(
    () => TEAM_ROLE_TABS_BASE.map((t) => ({ ...t, count: counts[t.id] || 0 })),
    [counts],
  );

  const rows = useMemo(
    () => members.filter((m) => m.primaryRoleKey === roleTab),
    [members, roleTab],
  );

  const col3 = STAFF_COL3[roleTab] || "Load";

  function openMember(id, focus) {
    const q = focus === "permissions" ? "?focus=permissions" : "";
    navigate(`${UPDATED_ADMIN_PATHS.teams}/${id}${q}`);
  }

  return (
    <main className="content ua-page-enter">
      <PageHeader
        title="Teams & roles"
        subtitle="Each team = 1 Wellness Coach + N assistants + assigned clients. Manage every staff role below."
        autosave
        onAutosave={() => onToast("Saved")}
        actions={
          <OrangeButton onClick={() => setCreateOpen(true)}>+ Create team member</OrangeButton>
        }
      />

      <SectionLabel hint="Filter by role">Team</SectionLabel>
      <PillTabs tabs={tabs} active={roleTab} onChange={setRoleTab} />

      {loading ? <p className="ua-page-head__sub">Loading team…</p> : null}
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
              const meta = TEAM_ROLE_META[s.primaryRoleKey] || TEAM_ROLE_META.wc;
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
                    <div>
                      <div className="ua-user-cell__name">{s.name}</div>
                      <div className="ua-user-cell__sub">{s.email}</div>
                    </div>
                  </div>
                  <div>
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
                  <div className="ua-table__load">{s.meta}</div>
                  <div>
                    <span
                      className={`ua-status-pill${
                        s.displayStatus === "Pending" ? " ua-status-pill--amber" : " ua-status-pill--green"
                      }`}
                    >
                      {s.displayStatus || "Active"}
                    </span>
                  </div>
                  <div className="ua-team-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="ua-team-actions__bell"
                      title="Send reminder"
                      onClick={() => onToast(`Reminder queued for ${s.name}`)}
                    >
                      🔔
                    </button>
                    <button
                      type="button"
                      className="ua-team-actions__perm"
                      onClick={() => openMember(s.id, "permissions")}
                    >
                      Permissions ›
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </TableScroll>
      ) : null}

      <CreateMemberModal
        open={createOpen}
        coaches={coaches}
        onClose={() => setCreateOpen(false)}
        onCreated={() => load()}
        onToast={onToast}
      />
    </main>
  );
}
