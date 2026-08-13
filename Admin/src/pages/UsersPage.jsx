import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { ExportIcon } from "../components/NavIcons.jsx";
import { OrangeButton, PageHeader, PillTabs, ScopeChip, TableScroll } from "../components/shared.jsx";
import {
  AWC_DEFAULT,
  AWC_OPTIONS,
  TIER_OPTIONS,
  USERS,
  WC_OPTIONS,
  avatarColor,
  buildUserTypeTabs,
  enrichUser,
  filterUsers,
  canDowngradeTier,
  lastActiveMinutes,
  nextTier,
  prevTier,
  tierLabel,
  tierStyle,
  userInitials,
} from "../data/usersData.js";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";

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

export function UsersPage() {
  const navigate = useNavigate();
  const { showToast: onToast } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState(null);
  const [tierOverrides, setTierOverrides] = useState({});
  const [coachOverrides, setCoachOverrides] = useState({});
  const [awcOverrides, setAwcOverrides] = useState({});
  const [disabledUsers, setDisabledUsers] = useState([]);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [disableTarget, setDisableTarget] = useState(null);
  const [reassignAsk, setReassignAsk] = useState(null);

  useEffect(() => {
    if (disableTarget || deleteTarget || reassignAsk) {
      document.activeElement?.blur?.();
    }
  }, [disableTarget, deleteTarget, reassignAsk]);

  const typeTab = searchParams.get("tab") || "all";
  const tierFilter = searchParams.get("tier") || "";
  const coachFilter = searchParams.get("coach") || "";

  const setTypeTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "all") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const setTierFilter = (tier) => {
    const next = new URLSearchParams(searchParams);
    if (!tier) next.delete("tier");
    else next.set("tier", tier);
    setSearchParams(next, { replace: true });
  };

  const clearCoachFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("coach");
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setSearchParams({}, { replace: true });
  };

  const overrideState = useMemo(
    () => ({ tierOverrides, coachOverrides, awcOverrides, disabledUsers }),
    [awcOverrides, coachOverrides, disabledUsers, tierOverrides],
  );

  const basePool = useMemo(
    () => USERS.filter((u) => !deletedUsers.includes(u.name)),
    [deletedUsers],
  );

  const enrichedPool = useMemo(
    () => basePool.map((u) => enrichUser(u, overrideState)),
    [basePool, overrideState],
  );

  const tabCountPool = useMemo(
    () => filterUsers(enrichedPool, {
      search,
      tierFilter,
      statusFilter,
      coachFilter,
    }),
    [coachFilter, enrichedPool, search, statusFilter, tierFilter],
  );

  const typeTabs = useMemo(
    () => buildUserTypeTabs(basePool, typeTab === "all" ? "" : typeTab, tabCountPool),
    [basePool, tabCountPool, typeTab],
  );

  const rows = useMemo(() => {
    let list = filterUsers(enrichedPool, {
      search,
      tierFilter,
      statusFilter,
      typeTab,
      coachFilter,
    });

    if (sort) {
      const dir = sort.dir === "desc" ? -1 : 1;
      list = [...list].sort((a, b) => (
        sort.key === "name"
          ? dir * a.name.localeCompare(b.name)
          : dir * (lastActiveMinutes(a.lastActive) - lastActiveMinutes(b.lastActive))
      ));
    }

    return list.map((u, i) => ({ ...u, n: i + 1 }));
  }, [coachFilter, enrichedPool, search, sort, statusFilter, tierFilter, typeTab]);

  const toggleSort = (key) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const convertTier = (user) => {
    const nx = nextTier(user.tier);
    setTierOverrides((prev) => ({ ...prev, [user.name]: nx }));
    onToast(`${user.name} moved to ${tierLabel(nx)} by Admin`);
  };

  const downgradeTier = (user) => {
    const dn = prevTier(user.tier);
    setTierOverrides((prev) => ({ ...prev, [user.name]: dn }));
    onToast(`${user.name} moved down to ${tierLabel(dn)} by Admin`);
  };

  const revertTier = (name) => {
    setTierOverrides((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    onToast(`Manual conversion undone for ${name}`);
  };

  const askDisable = (user) => {
    if (user.off) {
      setDisabledUsers((prev) => prev.filter((n) => n !== user.name));
      onToast(`${user.name}'s account is active again`);
      return;
    }
    setDisableTarget(user);
  };

  const confirmDisable = () => {
    if (!disableTarget) return;
    setDisabledUsers((prev) => [...prev, disableTarget.name]);
    onToast(`${disableTarget.name} disabled`);
    setDisableTarget(null);
  };

  const openUser = (name) => {
    const id = USERS.find((x) => x.name === name)?.n;
    if (id) navigate(UPDATED_ADMIN_PATHS.userDetail(id));
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeletedUsers((prev) => [...prev, deleteTarget.name]);
    setDeleteTarget(null);
    onToast(`${deleteTarget.name} deleted`);
  };

  const askReassign = (user, kind, to) => {
    const from = kind === "wc"
      ? (coachOverrides[user.name] ?? user.coach)
      : (awcOverrides[user.name] ?? user.awc ?? AWC_DEFAULT[user.coach] ?? "");
    if (to === from) return;
    setReassignAsk({ user: user.name, kind, from: from || "", to });
  };

  const confirmReassign = () => {
    if (!reassignAsk) return;
    const { user, kind, to } = reassignAsk;
    const isWc = kind === "wc";
    if (isWc) {
      setCoachOverrides((prev) => ({ ...prev, [user]: to }));
    } else {
      setAwcOverrides((prev) => ({ ...prev, [user]: to }));
    }
    onToast(
      to
        ? `${to} assigned as ${isWc ? "WC" : "AWC"} for ${user}`
        : `${isWc ? "WC" : "AWC"} removed for ${user}`,
    );
    setReassignAsk(null);
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
              <span className="page-head__count">{rows.length}</span> clients · <ScopeChip />
            </>
          )}
          actions={(
            <>
              <div className="ua-search-wrap">
                <svg className="ua-search-wrap__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                <input
                  className="ua-search-wrap__input"
                  placeholder="Search name, email, phone"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select className="header__select ua-users-filter" value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
                {TIER_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select className="header__select ua-users-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All status</option>
                <option>Active</option>
                <option>Disabled</option>
              </select>
              <button type="button" className="btn btn--outline ua-users-export" onClick={() => onToast("Exporting CSV…")}>
                <ExportIcon /> Export CSV
              </button>
              <OrangeButton onClick={() => onToast("Add user — coming soon")}>+ Add user</OrangeButton>
            </>
          )}
        />

        {coachFilter ? (
          <div className="ua-coach-filter">
            <span className="ua-coach-filter__label">Coach: {coachFilter}</span>
            <button type="button" className="ua-coach-filter__clear" title="Clear coach filter" onClick={clearCoachFilter}>×</button>
          </div>
        ) : null}

        <PillTabs tabs={typeTabs} active={typeTab} onChange={setTypeTab} />
      </div>

      <TableScroll>
        <div className="ua-table-card ua-table-card--users">
          <div className="ua-table ua-table--users ua-table__head">
            <div>#</div>
            <div>
              <SortButton
                label="User name"
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
            <div />
          </div>

          {rows.length === 0 ? (
            <div className="ua-users-empty">
              <div className="ua-users-empty__icon"><UsersEmptyIcon /></div>
              <div className="ua-users-empty__title">No clients found</div>
              <p className="ua-users-empty__sub">No records match your filters. Try clearing the search or filters.</p>
              <button type="button" className="btn btn--outline" onClick={clearFilters}>Clear filters</button>
            </div>
          ) : (
            rows.map((u, i) => {
              const tier = tierStyle(u.tier);
              const tone = u.off ? "red" : u.status === "Active" ? "green" : "muted";
              const canConvert = u.tier !== "Maintenance";
              const canDowngrade = canDowngradeTier(u.tier, u.ageDays);

              return (
                <div
                  key={u.name}
                  className="ua-table ua-table--users ua-table__row"
                  onClick={() => openUser(u.name)}
                >
                  <div className="ua-table__muted">{u.n}</div>
                  <div className="ua-user-cell">
                    <span className="ua-avatar" style={{ background: avatarColor(i) }}>{userInitials(u.name)}</span>
                    <div>
                      <div className="ua-user-cell__name">{u.name}</div>
                      <div className="ua-user-cell__sub">{u.email} · {u.goal}</div>
                    </div>
                  </div>
                  <div className="ua-users-tier" onClick={(e) => e.stopPropagation()}>
                    <span className="ua-tier" style={{ background: tier.bg, color: tier.color }}>{tierLabel(u.tier)}</span>
                    {canConvert ? (
                      <button
                        type="button"
                        className="ua-tier-action ua-tier-action--up"
                        title={u.tier === "Seek to Heal"
                          ? `Move ${u.name} into MAINTENANCE — for when every goal has been achieved`
                          : `Move ${u.name} up to ${u.tier === "Seek" ? "PWC" : "HEAL"} by hand — for when the automatic upgrade did not go through`}
                        onClick={() => convertTier(u)}
                      >
                        → {tierLabel(nextTier(u.tier))}
                      </button>
                    ) : null}
                    {canDowngrade ? (
                      <button
                        type="button"
                        className="ua-tier-action ua-tier-action--down"
                        title={u.tier === "Maintenance"
                          ? `Move ${u.name} back to HEAL — for when maintenance was entered too early`
                          : `Move ${u.name} back down to SEEK — allowed because the account is ${u.ageDays} days old`}
                        onClick={() => downgradeTier(u)}
                      >
                        ↓ {tierLabel(prevTier(u.tier))}
                      </button>
                    ) : null}
                    {u.converted ? (
                      <button type="button" className="ua-tier-action ua-tier-action--undo" title="Undo this manual change" onClick={() => revertTier(u.name)}>undo</button>
                    ) : null}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <select
                      className="ua-inline-select"
                      value={u.coach}
                      onChange={(e) => askReassign(u, "wc", e.target.value)}
                    >
                      {WC_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <select
                      className="ua-inline-select"
                      value={u.awc || AWC_OPTIONS[0]}
                      onChange={(e) => askReassign(u, "awc", e.target.value)}
                    >
                      {AWC_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="ua-table__muted">{u.lastActive}</div>
                  <div>
                    <span className={`ua-status-badge ua-status-badge--${tone}`}>
                      <span className="ua-status-badge__dot" />
                      {u.status}
                    </span>
                  </div>
                  <div className="ua-users-row-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`ua-users-row-actions__disable${u.off ? " ua-users-row-actions__disable--on" : ""}`}
                      title={u.off ? `Re-enable ${u.name}'s account` : `Disable ${u.name}'s account — they lose app access, the record stays`}
                      onClick={() => askDisable(u)}
                    >
                      <DisableIcon off={u.off} />
                    </button>
                    <button
                      type="button"
                      className="ua-users-row-actions__delete"
                      title={`Delete ${u.name}`}
                      onClick={() => setDeleteTarget(u)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </TableScroll>

      {reassignAsk ? (
        <div className="ua-dialog-backdrop" onClick={() => setReassignAsk(null)} role="presentation">
          <div
            className="ua-dialog ua-dialog--confirm"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reassign-user-title"
          >
            <div className="ua-dialog__kicker ua-dialog__kicker--blue">Coach reassignment</div>
            <div id="reassign-user-title" className="ua-dialog__title ua-dialog__title--confirm">
              {reassignAsk.kind === "wc" ? "Reassign wellness coach" : "Reassign assistant WC"} for {reassignAsk.user}?
            </div>
            <p className="ua-dialog__body">
              <span className="ua-dialog__reassign-from">{reassignAsk.from || "Unassigned"}</span>
              {" → "}
              <span className="ua-dialog__reassign-to">{reassignAsk.to || "Unassigned"}</span>
              <br />
              {reassignAsk.to
                ? `This reassigns the client’s ${reassignAsk.kind === "wc" ? "wellness coach" : "assistant coach"} immediately. The change is written to the audit log.`
                : `This leaves ${reassignAsk.user} without ${reassignAsk.kind === "wc" ? "a wellness coach" : "an assistant coach"}. The change is written to the audit log.`}
            </p>
            <div className="ua-dialog__actions">
              <button type="button" className="btn btn--outline" onClick={() => setReassignAsk(null)}>Cancel</button>
              <button type="button" className="ua-dialog__btn-primary" onClick={confirmReassign}>Confirm</button>
            </div>
          </div>
        </div>
      ) : null}

      {disableTarget ? (
        <div className="ua-dialog-backdrop" onClick={() => setDisableTarget(null)} role="presentation">
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
              <button type="button" className="btn btn--outline" onClick={() => setDisableTarget(null)}>Cancel</button>
              <button type="button" className="ua-dialog__btn-danger" onClick={confirmDisable}>Yes, disable it</button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="ua-dialog-backdrop" onClick={() => setDeleteTarget(null)} role="presentation">
          <div className="ua-dialog ua-dialog--danger" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-user-title">
            <div className="ua-dialog__head">
              <div className="ua-dialog__icon ua-dialog__icon--danger"><TrashIcon /></div>
              <div id="delete-user-title" className="ua-dialog__title">Delete {deleteTarget.name}?</div>
            </div>
            <p className="ua-dialog__body">
              This removes the client record, their coach assignment and all tracked history. This cannot be undone.
            </p>
            <div className="ua-dialog__actions">
              <button type="button" className="btn btn--outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className="ua-dialog__btn-danger" onClick={confirmDelete}>Delete user</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
