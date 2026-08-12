import { useOutletContext, useSearchParams } from "react-router-dom";
import { OrangeButton, PageHeader, PillTabs, SectionLabel, TableScroll } from "../components/shared.jsx";
import { STAFF_BY_ROLE, TEAM_ROLE_TABS } from "../data/teamsData.js";

const STAFF_AVATARS = ["#34a56a", "#5e6ad2", "#0d9488", "#ec7a45", "#c2661d", "#7c8aa5"];

function staffInitials(name) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("");
}

export function TeamsPage() {
  const { showToast: onToast } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const roleTab = searchParams.get("role") || "wc";
  const setRoleTab = (role) => {
    const next = new URLSearchParams(searchParams);
    if (role === "wc") next.delete("role");
    else next.set("role", role);
    setSearchParams(next, { replace: true });
  };

  const rows = STAFF_BY_ROLE[roleTab] ?? [];

  return (
    <main className="content ua-page-enter">
      <PageHeader
        title="Teams & roles"
        subtitle="Each team = 1 Wellness Coach + N assistants + assigned clients. Manage every staff role below."
        autosave
        onAutosave={() => onToast("Saved")}
        actions={<OrangeButton onClick={() => onToast("Create team member — coming soon")}>+ Create team member</OrangeButton>}
      />

      <SectionLabel hint="Filter by role">Team</SectionLabel>
      <PillTabs tabs={TEAM_ROLE_TABS} active={roleTab} onChange={setRoleTab} />

      <TableScroll>
        <div className="ua-table-card">
          <div className="ua-table ua-table--teams ua-table__head">
            <div>Name</div>
            <div>Role</div>
            <div>Load</div>
            <div>Status</div>
            <div style={{ textAlign: "right" }}>Actions</div>
          </div>
          {rows.map((s, i) => (
            <div key={s.email} className="ua-table ua-table--teams ua-table__row" onClick={() => onToast(`Opening ${s.name}`)} role="button" tabIndex={0}>
              <div className="ua-user-cell">
                <span className="ua-avatar ua-avatar--staff" style={{ background: s.avatarColor || STAFF_AVATARS[i % STAFF_AVATARS.length] }}>
                  {staffInitials(s.name)}
                </span>
                <div>
                  <div className="ua-user-cell__name">{s.name}</div>
                  <div className="ua-user-cell__sub">{s.email}@irwellness.in</div>
                </div>
              </div>
              <div>
                <span className="ua-role-chip" style={{ background: s.roleBg, color: s.roleColor, borderColor: s.roleBorder }}>
                  {s.role}
                </span>
              </div>
              <div className="ua-table__load">{s.meta}</div>
              <div>
                <span className={`ua-status-pill${s.status === "Pending" ? " ua-status-pill--amber" : " ua-status-pill--green"}`}>
                  {s.status}
                </span>
              </div>
              <div className="ua-team-actions" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="ua-team-actions__bell" title="Send reminder" onClick={() => onToast(`Reminder sent to ${s.name}`)}>🔔</button>
                <button type="button" className="ua-team-actions__perm" onClick={() => onToast(`Permissions for ${s.name}`)}>Permissions ›</button>
              </div>
            </div>
          ))}
        </div>
      </TableScroll>
    </main>
  );
}
