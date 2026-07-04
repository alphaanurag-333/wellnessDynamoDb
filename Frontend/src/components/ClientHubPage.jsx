import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { UserTierBadge, formatAssignedCoachLabel } from "./ReferralAssignmentShared.jsx";
import { CoachPageLoadingState } from "../wellnessCoach/components/CoachPageLoader.jsx";
import { NotFoundPage } from "../admin/pages/NotFoundPage.jsx";
import {
  getClientHubTabGroups,
  resolveClientHubTab,
} from "./clientHubShared.js";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function ClientHubPage({
  listPath,
  fetchUser,
  renderTab,
  showReassign = false,
  onReassign,
}) {
  const { userId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const tabGroups = useMemo(() => getClientHubTabGroups(user?.userTier), [user?.userTier]);
  const activeTab = resolveClientHubTab(searchParams.get("tab"), user?.userTier);

  const setActiveTab = useCallback(
    (tabId) => {
      const next = new URLSearchParams(searchParams);
      next.set("tab", tabId);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const loadUser = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setNotFound(false);
    try {
      const row = await fetchUser(userId);
      if (!row) {
        setNotFound(true);
        return;
      }
      setUser(row);
    } catch (e) {
      if (e?.status === 404 || e?.status === 403) {
        setNotFound(true);
        return;
      }
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Could not load client." });
    } finally {
      setLoading(false);
    }
  }, [fetchUser, userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser, reloadKey]);

  useEffect(() => {
    if (!user || loading) return;
    const resolved = resolveClientHubTab(searchParams.get("tab"), user.userTier);
    if (searchParams.get("tab") !== resolved) {
      setActiveTab(resolved);
    }
  }, [loading, searchParams, setActiveTab, user]);

  if (notFound) return <NotFoundPage />;
  if (loading && !user) return <CoachPageLoadingState label="Loading client…" />;

  const phoneLine = [user?.phoneCountryCode, user?.phone].filter(Boolean).join(" ") || "—";
  const coachLine = user ? formatAssignedCoachLabel(user) : "";

  return (
    <div className="page-card client-hub-page">
      <div className="client-hub-page__topbar">
        <Link to={listPath} className="btn btn--ghost btn--sm">
          ← Back to clients
        </Link>
        {showReassign && onReassign ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onReassign(user)}>
            Reassign
          </button>
        ) : null}
      </div>

      <div className="client-hub-page__header">
        <div className="client-hub-page__identity">
          <div className="client-hub-page__avatar" aria-hidden="true">
            {getInitials(user?.name)}
          </div>
          <div className="client-hub-page__profile-main">
            <h2 className="client-hub-page__name">{user?.name || "Client"}</h2>
            <p className="client-hub-page__meta">{user?.email || "—"}</p>
            <p className="client-hub-page__meta">
              {phoneLine}
              {coachLine ? ` · ${coachLine}` : ""}
            </p>
          </div>
        </div>
        <div className="client-hub-page__profile-badges">
          <UserTierBadge tier={user?.userTier} assignmentStatus={user?.assignmentStatus} />
          <span className="client-hub-page__joined">Joined {formatDate(user?.convertedAt || user?.createdAt)}</span>
        </div>
      </div>

      <div className="client-hub-layout">
        <aside className="client-hub-nav" aria-label="Client programs">
          <label className="client-hub-nav__mobile-jump user-field">
            <span className="user-field__label">Program section</span>
            <select
              className="user-field__input"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
            >
              {tabGroups.map((group) => (
                <optgroup key={group.id} label={group.label}>
                  {group.tabs.map((tab) => (
                    <option key={tab.id} value={tab.id}>
                      {tab.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <div className="client-hub-nav__groups">
            {tabGroups.map((group) => (
              <div key={group.id} className="client-hub-nav__group">
                <span className="client-hub-nav__group-label">{group.label}</span>
                <ul className="client-hub-nav__list" role="tablist" aria-label={group.label}>
                  {group.tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <li key={tab.id}>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          aria-controls={`client-hub-panel-${tab.id}`}
                          id={`client-hub-tab-${tab.id}`}
                          className={`client-hub-nav__btn${isActive ? " client-hub-nav__btn--active" : ""}`}
                          onClick={() => setActiveTab(tab.id)}
                        >
                          {tab.shortLabel || tab.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        <div className="client-hub-layout__main">
          <div
            id={`client-hub-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`client-hub-tab-${activeTab}`}
            className="client-hub-page__panel"
          >
            {renderTab(activeTab, { embedded: true, user, onUserUpdated: () => setReloadKey((k) => k + 1) })}
          </div>
        </div>
      </div>
    </div>
  );
}
