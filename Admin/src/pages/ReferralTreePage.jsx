import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { PageHeader, PillTabs, TableScroll } from "../components/shared.jsx";
import { ReferralOrgTree } from "../components/ReferralOrgTree.jsx";
import { fetchReferralOverview, fetchReferralTree } from "../api/referralTreeApi.js";
import { fetchUsers } from "../api/usersApi.js";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import "./referralTree.css";

function looksLikeUserId(value) {
  const s = String(value || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function tierLabel(tier) {
  const key = String(tier || "").toLowerCase();
  if (key === "heal") return "Heal";
  if (key === "seek") return "Seek";
  if (key === "consultancy_only") return "Consultancy";
  if (key === "maintenance") return "Maintenance";
  return tier || "—";
}

function entityLabel(entityType) {
  const key = String(entityType || "").toLowerCase();
  if (key === "user") return "Peer";
  if (key === "wellness_coach") return "Coach";
  if (key === "assistant_wellness_coach") return "Assistant WC";
  return entityType || "—";
}

function formatWhen(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Keep table/search UI readable when test/long names leak in. */
function shortLabel(value, max = 28) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

/** Collapse nodes deeper than depth 1 by default for readability. */
function defaultCollapsed(node, into = new Set()) {
  if (!node) return into;
  if (Array.isArray(node.children) && node.children.length) {
    if (node.depth >= 1) into.add(node.id);
    for (const child of node.children) defaultCollapsed(child, into);
  }
  return into;
}

export function ReferralTreePage() {
  const { can } = useViewAs();
  const canView = can("console.rt.view");
  const canOpenUser = can("console.cl.view");
  const canSearchUsers = can("console.cl.view");

  const [listTab, setListTab] = useState("staff");
  const [query, setQuery] = useState("");
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [treeLoading, setTreeLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [topReferrers, setTopReferrers] = useState([]);
  const [topStaffReferrers, setTopStaffReferrers] = useState([]);
  const [recentReferrals, setRecentReferrals] = useState([]);
  const [root, setRoot] = useState(null);
  const [meta, setMeta] = useState(null);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setError("");
    try {
      const data = await fetchReferralOverview();
      setSummary(data.summary);
      setTopReferrers(data.topReferrers);
      setTopStaffReferrers(data.topStaffReferrers);
      setRecentReferrals(data.recentReferrals);
    } catch (err) {
      setSummary(null);
      setTopReferrers([]);
      setTopStaffReferrers([]);
      setRecentReferrals([]);
      setError(err?.message || "Could not load referral overview");
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadTree = useCallback(async (params = {}) => {
    setTreeLoading(true);
    setError("");
    setSuggestions([]);
    setSuggestOpen(false);
    try {
      const result = await fetchReferralTree(params);
      setRoot(result.root);
      setMeta(result.meta);
      setCollapsed(defaultCollapsed(result.root));
      setSuggestions([]);
      setSuggestOpen(false);
    } catch (err) {
      setRoot(null);
      setMeta(null);
      setCollapsed(new Set());
      setError(err?.message || "Could not load referral tree");
    } finally {
      setTreeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canView) return undefined;
    loadOverview();
    return undefined;
  }, [canView, loadOverview]);

  useEffect(() => {
    if (!canView || !canSearchUsers || root || treeLoading || listTab === "staff") {
      setSuggestions([]);
      setSuggestLoading(false);
      return undefined;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2 || !suggestOpen) {
      setSuggestions([]);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const { users } = await fetchUsers({ page: 1, limit: 8, search: trimmed });
        if (!cancelled) setSuggestions(users || []);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSuggestLoading(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canView, canSearchUsers, query, root, treeLoading, listTab, suggestOpen]);

  const clearTree = useCallback(() => {
    setRoot(null);
    setMeta(null);
    setCollapsed(new Set());
    setQuery("");
    setSuggestions([]);
    setSuggestOpen(false);
    setError("");
  }, []);

  const onSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) {
        setError("Enter a name, staff/user id, or referral code");
        return;
      }
      if (looksLikeUserId(trimmed)) {
        // Try as staff entity first when on staff tab, else user
        if (listTab === "staff") {
          await loadTree({ rootEntityId: trimmed, mode: "coach" });
          return;
        }
        await loadTree({ rootUserId: trimmed, mode: "user" });
        return;
      }
      if (canSearchUsers && listTab !== "staff") {
        try {
          const { users } = await fetchUsers({ page: 1, limit: 1, search: trimmed });
          if (users?.[0]?.id) {
            setQuery(users[0].name || trimmed);
            await loadTree({ rootUserId: users[0].id, mode: "user" });
            return;
          }
        } catch {
          // fall through
        }
      }
      await loadTree({
        referralCode: trimmed,
        mode: listTab === "staff" ? "coach" : "user",
      });
    },
    [query, loadTree, canSearchUsers, listTab]
  );

  const onPickSuggestion = useCallback(
    async (user) => {
      const id = user?.id;
      if (!id) return;
      setSuggestOpen(false);
      setSuggestions([]);
      setQuery(user.name || user.referralCode || id);
      await loadTree({ rootUserId: id, mode: "user" });
    },
    [loadTree]
  );

  const onToggleCollapse = useCallback((id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setCollapsed(new Set()), []);
  const collapseDeep = useCallback(() => {
    if (root) setCollapsed(defaultCollapsed(root));
  }, [root]);

  const treeSubtitle = useMemo(() => {
    if (!meta) return null;
    const parts = [
      meta.mode === "coach" ? "Staff code tree" : "Peer tree",
      `${meta.nodeCount} node${meta.nodeCount === 1 ? "" : "s"}`,
    ];
    if (meta.directCount != null) parts.push(`${meta.directCount} direct`);
    if (meta.truncated) parts.push("truncated");
    return parts.join(" · ");
  }, [meta]);

  const listTabs = useMemo(
    () => [
      { id: "staff", label: `Staff codes (${topStaffReferrers.length})` },
      { id: "peer", label: `Peer referrers (${topReferrers.length})` },
    ],
    [topStaffReferrers.length, topReferrers.length]
  );

  if (!canView) {
    return (
      <main className="content ua-page-enter">
        <PageHeader title="Referral Tree" subtitle="You do not have permission to view the referral tree." />
      </main>
    );
  }

  const showOverview = !root;

  return (
    <main className="content ua-page-enter ua-rt-page">
      <PageHeader
        title={root ? shortLabel(root.name || "Referral tree", 40) : "Referral Tree"}
        subtitle={
          root
            ? treeSubtitle || "Live referral genealogy"
            : "Browse staff or peer referral networks, then open a live tree."
        }
        meta={
          !root && summary ? (
            <span className="page-head__count">
              {summary.totalWithReferral} referred · {summary.staffReferrersWithDownline || 0} staff ·{" "}
              {summary.referrersWithDownline} peer
            </span>
          ) : root && treeSubtitle ? (
            <span className="page-head__count">{treeSubtitle}</span>
          ) : null
        }
        actions={
          !root ? (
            <button type="button" className="ua-btn-orange ua-rt-back" onClick={loadOverview} disabled={overviewLoading}>
              Refresh
            </button>
          ) : null
        }
      />

      {root || treeLoading ? (
        <div className="ua-rt-treebar">
          <button type="button" className="ua-rt-treebar__back" onClick={clearTree} disabled={treeLoading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to overview
          </button>
          <div className="ua-rt-treebar__info">
            <span className="ua-rt-treebar__name" title={root?.name || undefined}>
              {shortLabel(root?.name || (treeLoading ? "Loading…" : "Tree"), 36)}
            </span>
            {root?.referralCode ? <span className="ua-rt-chip">{root.referralCode}</span> : null}
            {meta?.mode === "coach" ? <span className="ua-rt-chip ua-rt-chip--staff">Staff code</span> : null}
            {meta?.mode === "user" ? <span className="ua-rt-chip ua-rt-chip--muted">Peer tree</span> : null}
          </div>
          <div className="ua-rt-treebar__actions">
            <button type="button" className="ua-rt-ghost" onClick={expandAll} disabled={!root}>
              Expand all
            </button>
            <button type="button" className="ua-rt-ghost" onClick={collapseDeep} disabled={!root}>
              Collapse
            </button>
          </div>
        </div>
      ) : (
        <section className="ua-rt-find">
          <div className="ua-rt-find__tabs">
            <PillTabs
              tabs={listTabs}
              active={listTab}
              onChange={(next) => {
                setListTab(next);
                setQuery("");
                setSuggestions([]);
                setSuggestOpen(false);
              }}
            />
          </div>
          <form className="ua-rt-toolbar" onSubmit={onSubmit}>
            <div className="ua-search-wrap ua-rt-search">
              <svg className="ua-search-wrap__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="search"
                className="ua-search-wrap__input"
                placeholder={
                  listTab === "staff"
                    ? "Paste staff referral code or id…"
                    : canSearchUsers
                      ? "Search client name or paste referral code…"
                      : "Paste user id or referral code…"
                }
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSuggestOpen(true);
                }}
                onFocus={() => setSuggestOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setSuggestOpen(false), 150);
                }}
                autoComplete="off"
              />
              {suggestOpen && listTab !== "staff" && (suggestLoading || suggestions.length > 0 || query.trim().length >= 2) ? (
                <div className="ua-rt-suggest" role="listbox">
                  {suggestLoading ? <div className="ua-rt-suggest__empty">Searching…</div> : null}
                  {!suggestLoading &&
                    suggestions.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="ua-rt-suggest__item"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onPickSuggestion(user)}
                      >
                        <span className="ua-rt-suggest__name" title={user.name || "Unnamed"}>
                          {shortLabel(user.name || "Unnamed", 42)}
                        </span>
                        <span className="ua-rt-suggest__code">{user.referralCode || user.id}</span>
                      </button>
                    ))}
                  {!suggestLoading && query.trim().length >= 2 && suggestions.length === 0 ? (
                    <div className="ua-rt-suggest__empty">No matching users</div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <button type="submit" className="ua-btn-orange" disabled={treeLoading}>
              Open tree
            </button>
          </form>
        </section>
      )}

      {error ? <p className="ua-rt-error">{error}</p> : null}

      {treeLoading ? (
        <div className="ua-rt-loading">
          <BrandLoader />
        </div>
      ) : null}

      {!treeLoading && root ? (
        <div className="ua-rt-panel ua-rt-panel--org">
          {meta?.truncated ? (
            <p className="ua-rt-banner">
              Tree truncated at {meta.nodeCount} nodes (depth cap {meta.maxDepth}).
            </p>
          ) : null}
          <ReferralOrgTree
            root={root}
            collapsedMap={collapsed}
            onToggle={onToggleCollapse}
            canOpenUser={canOpenUser}
          />
        </div>
      ) : null}

      {showOverview && overviewLoading ? (
        <div className="ua-rt-loading">
          <BrandLoader />
        </div>
      ) : null}

      {showOverview && !overviewLoading && summary ? (
        <>
          <div className="ua-rt-stats">
            <div className="ua-rt-stat">
              <div className="ua-rt-stat__label">Referred users</div>
              <div className="ua-rt-stat__value">{summary.totalWithReferral}</div>
              <div className="ua-rt-stat__hint">of {summary.totalUsers} total clients</div>
            </div>
            <div className="ua-rt-stat">
              <div className="ua-rt-stat__label">Via staff codes</div>
              <div className="ua-rt-stat__value">{summary.coachReferred + summary.awcReferred}</div>
              <div className="ua-rt-stat__hint">
                {summary.coachReferred} coach · {summary.awcReferred} assistant
              </div>
            </div>
            <div className="ua-rt-stat">
              <div className="ua-rt-stat__label">Peer referrals</div>
              <div className="ua-rt-stat__value">{summary.peerReferred}</div>
              <div className="ua-rt-stat__hint">client → client chains</div>
            </div>
            <div className="ua-rt-stat">
              <div className="ua-rt-stat__label">Active codes</div>
              <div className="ua-rt-stat__value">{summary.staffReferrersWithDownline || 0}</div>
              <div className="ua-rt-stat__hint">{summary.referrersWithDownline} peer referrers</div>
            </div>
          </div>

          <div className="ua-rt-grid">
            <section className="ua-rt-panel ua-rt-panel--table">
              <div className="ua-rt-panel__head">
                <h2 className="ua-rt-panel__title">
                  {listTab === "staff" ? "Staff referral codes" : "Top peer referrers"}
                </h2>
                <p className="ua-rt-panel__hint">
                  {listTab === "staff"
                    ? "Coach / assistant code → clients who used it → their sub-referrals."
                    : "Clients who referred other clients. Click a row to open the peer tree."}
                </p>
              </div>

              {listTab === "staff" ? (
                topStaffReferrers.length === 0 ? (
                  <div className="ua-rt-empty">No staff-code referrals yet.</div>
                ) : (
                  <div className="ua-table-card ua-rt-table-card">
                    <TableScroll>
                      <div className="ua-table ua-table--rt-staff ua-table__head">
                        <div>Staff</div>
                        <div>Code</div>
                        <div>Role</div>
                        <div>Direct</div>
                        <div />
                      </div>
                      {topStaffReferrers.map((row) => {
                        const fullName = row.name || (row.missing ? "Unknown staff" : "Unnamed");
                        return (
                          <button
                            key={row.id}
                            type="button"
                            className="ua-table ua-table--rt-staff ua-table__row ua-rt-click-row"
                            onClick={() => {
                              setQuery(row.referralCode || row.id);
                              loadTree({ rootEntityId: row.id, mode: "coach" });
                            }}
                          >
                            <div className="ua-rt-cell-name" data-label="Staff">
                              <span className="ua-rt-ellipsis" title={fullName}>
                                {shortLabel(fullName, 32)}
                              </span>
                            </div>
                            <div className="ua-rt-mono" data-label="Code">
                              {row.referralCode || "—"}
                            </div>
                            <div data-label="Role">{entityLabel(row.entityType)}</div>
                            <div className="ua-rt-direct" data-label="Direct">
                              {row.directCount}
                            </div>
                            <div className="ua-rt-open" data-label="">
                              Tree →
                            </div>
                          </button>
                        );
                      })}
                    </TableScroll>
                  </div>
                )
              ) : topReferrers.length === 0 ? (
                <div className="ua-rt-empty">No peer referral chains yet.</div>
              ) : (
                <div className="ua-table-card ua-rt-table-card">
                  <TableScroll>
                    <div className="ua-table ua-table--rt-top ua-table__head">
                      <div>Referrer</div>
                      <div>Code</div>
                      <div>Tier</div>
                      <div>Direct</div>
                      <div />
                    </div>
                    {topReferrers.map((row) => {
                      const fullName = row.name || (row.missing ? "Unknown user" : "Unnamed");
                      return (
                        <button
                          key={row.id}
                          type="button"
                          className="ua-table ua-table--rt-top ua-table__row ua-rt-click-row"
                          onClick={() => {
                            setQuery(row.referralCode || row.id);
                            loadTree({ rootUserId: row.id, mode: "user" });
                          }}
                        >
                          <div className="ua-rt-cell-name" data-label="Referrer">
                            <span className="ua-rt-ellipsis" title={fullName}>
                              {shortLabel(fullName, 32)}
                            </span>
                            {canOpenUser ? (
                              <Link
                                className="ua-rt-inline-link"
                                to={UPDATED_ADMIN_PATHS.userDetail(row.id)}
                                onClick={(event) => event.stopPropagation()}
                              >
                                Profile
                              </Link>
                            ) : null}
                          </div>
                          <div className="ua-rt-mono" data-label="Code">
                            {row.referralCode || "—"}
                          </div>
                          <div data-label="Tier">{tierLabel(row.userTier)}</div>
                          <div className="ua-rt-direct" data-label="Direct">
                            {row.directCount}
                          </div>
                          <div className="ua-rt-open" data-label="">
                            Tree →
                          </div>
                        </button>
                      );
                    })}
                  </TableScroll>
                </div>
              )}
            </section>

            <section className="ua-rt-panel ua-rt-panel--table">
              <div className="ua-rt-panel__head">
                <h2 className="ua-rt-panel__title">Recent referrals</h2>
                <p className="ua-rt-panel__hint">Latest clients who joined with a referral code.</p>
              </div>
              {recentReferrals.length === 0 ? (
                <div className="ua-rt-empty">No referral attributions yet.</div>
              ) : (
                <div className="ua-table-card ua-rt-table-card">
                  <TableScroll>
                    <div className="ua-table ua-table--rt-recent ua-table__head">
                      <div>Client</div>
                      <div>Joined via</div>
                      <div>Source</div>
                      <div>When</div>
                    </div>
                    {recentReferrals.map((row) => {
                      const clientName = row.name || "Unnamed";
                      const viaLabel = row.referredByUserId
                        ? row.referrerName || row.referrerCode || "Peer"
                        : row.referrerCode || row.referredByCode || "—";
                      return (
                        <div key={row.id} className="ua-table ua-table--rt-recent ua-table__row">
                          <div className="ua-rt-cell-name" data-label="Client">
                            {canOpenUser ? (
                              <Link
                                className="ua-rt-name ua-rt-ellipsis"
                                to={UPDATED_ADMIN_PATHS.userDetail(row.id)}
                                title={clientName}
                              >
                                {shortLabel(clientName, 28)}
                              </Link>
                            ) : (
                              <span className="ua-rt-name ua-rt-ellipsis" title={clientName}>
                                {shortLabel(clientName, 28)}
                              </span>
                            )}
                            <span className="ua-rt-sub">{tierLabel(row.userTier)}</span>
                          </div>
                          <div className="ua-rt-via" data-label="Joined via">
                            {row.referredByUserId ? (
                              <button
                                type="button"
                                className="ua-rt-text-btn ua-rt-ellipsis"
                                title={viaLabel}
                                onClick={() => {
                                  setQuery(row.referrerCode || row.referredByUserId);
                                  loadTree({ rootUserId: row.referredByUserId, mode: "user" });
                                }}
                              >
                                {shortLabel(viaLabel, 24)}
                              </button>
                            ) : row.referredByEntityId ? (
                              <button
                                type="button"
                                className="ua-rt-text-btn ua-rt-ellipsis"
                                title={viaLabel}
                                onClick={() => {
                                  setQuery(row.referrerCode || row.referredByCode || row.referredByEntityId);
                                  loadTree({ rootEntityId: row.referredByEntityId, mode: "coach" });
                                }}
                              >
                                {shortLabel(viaLabel, 24)}
                              </button>
                            ) : (
                              <span className="ua-rt-ellipsis" title={viaLabel}>
                                {shortLabel(viaLabel, 24)}
                              </span>
                            )}
                          </div>
                          <div data-label="Source">{entityLabel(row.referredByEntityType)}</div>
                          <div className="ua-rt-when" data-label="When">
                            {formatWhen(row.createdAt)}
                          </div>
                        </div>
                      );
                    })}
                  </TableScroll>
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </main>
  );
}
