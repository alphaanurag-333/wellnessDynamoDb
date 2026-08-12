import { useMemo, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { ExportIcon } from "../components/NavIcons.jsx";
import { OrangeButton, PageHeader, PillTabs, ScopeChip, TableScroll } from "../components/shared.jsx";
import {
  AWC_OPTIONS,
  USERS,
  USER_TYPE_TABS,
  WC_OPTIONS,
  avatarColor,
  tierStyle,
  userInitials,
} from "../data/usersData.js";

export function UsersPage() {
  const navigate = useNavigate();
  const { showToast: onToast } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");

  const typeTab = searchParams.get("tab") || "all";
  const setTypeTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "all") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const rows = useMemo(() => {
    return USERS.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchTab = typeTab === "all" || u.type === typeTab;
      return matchSearch && matchTab;
    });
  }, [search, typeTab]);

  const activeTabMeta = USER_TYPE_TABS.find((t) => t.id === typeTab)?.count ?? rows.length;

  return (
    <main className="content ua-page-enter">
      <PageHeader
        title="User Management"
        layout="split"
        backLink="Dashboard"
        autosave
        onAutosave={() => onToast("Saved")}
        meta={(
          <>
            <strong>{activeTabMeta}</strong> clients · <ScopeChip />
          </>
        )}
        actions={(
          <>
            <div className="ua-search-wrap">
              <svg className="ua-search-wrap__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              <input className="ua-search-wrap__input" placeholder="Search name, email, phone" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="header__select" defaultValue=""><option value="">All tiers</option><option>HEAL</option><option>PWC</option><option>SEEK</option></select>
            <select className="header__select" defaultValue=""><option>All status</option><option>Active</option><option>Inactive</option></select>
            <button type="button" className="btn btn--outline" onClick={() => onToast("Exporting CSV…")}><ExportIcon /> Export CSV</button>
            <OrangeButton onClick={() => onToast("Add user — coming soon")}>+ Add user</OrangeButton>
          </>
        )}
      />

      <PillTabs tabs={USER_TYPE_TABS} active={typeTab} onChange={setTypeTab} />

      <TableScroll>
        <div className="ua-table-card ua-table-card--users">
          <div className="ua-table ua-table--users ua-table__head">
            <div>#</div><div>User info</div><div>Tier</div><div>Wellness coach</div><div>Assistant WC</div><div>Last active</div><div>Status</div>
          </div>
          {rows.map((u, i) => {
            const tier = tierStyle(u.tier);
            return (
              <div key={u.n} className="ua-table ua-table--users ua-table__row" onClick={() => navigate(`/updatedadmin/users/${u.n}`)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate(`/updatedadmin/users/${u.n}`)}>
                <div className="ua-table__muted">{i + 1}</div>
                <div className="ua-user-cell">
                  <span className="ua-avatar" style={{ background: avatarColor(i) }}>{userInitials(u.name)}</span>
                  <div>
                    <div className="ua-user-cell__name">{u.name}</div>
                    <div className="ua-user-cell__sub">{u.email} · {u.goal}</div>
                  </div>
                </div>
                <div><span className="ua-tier" style={{ background: tier.bg, color: tier.color }}>{u.tier}</span></div>
                <div onClick={(e) => e.stopPropagation()}><select className="ua-inline-select" defaultValue={u.coach} onChange={() => onToast("Coach reassigned")}>{WC_OPTIONS.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div onClick={(e) => e.stopPropagation()}><select className="ua-inline-select" defaultValue={u.awc || AWC_OPTIONS[0]} onChange={() => onToast("AWC reassigned")}>{AWC_OPTIONS.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="ua-table__muted">{u.lastActive}</div>
                <div><span className="ua-status-pill ua-status-pill--green">{u.status}</span></div>
              </div>
            );
          })}
        </div>
      </TableScroll>
    </main>
  );
}
