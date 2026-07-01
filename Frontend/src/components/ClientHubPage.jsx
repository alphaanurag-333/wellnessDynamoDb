import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { UserTierBadge, formatAssignedCoachLabel } from "./ReferralAssignmentShared.jsx";
import { CoachPageLoadingState } from "../wellnessCoach/components/CoachPageLoader.jsx";
import { NotFoundPage } from "../admin/pages/NotFoundPage.jsx";
import { getClientHubTabs, resolveClientHubTab } from "./clientHubShared.js";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { dateStyle: "medium" });
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

  const tabs = useMemo(() => getClientHubTabs(user?.userTier), [user?.userTier]);
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

  return (
    <div className="page-card client-hub-page">
      <div className="client-hub-page__header">
        <Link to={listPath} className="btn btn--ghost btn--sm client-hub-page__back">
          ← Back to clients
        </Link>
        <div className="client-hub-page__profile">
          <div className="client-hub-page__profile-main">
            <h2 className="client-hub-page__name">{user?.name || "Client"}</h2>
            <p className="client-hub-page__meta">{user?.email || "—"}</p>
            <p className="client-hub-page__meta">
              {[user?.phoneCountryCode, user?.phone].filter(Boolean).join(" ") || "—"}
              {user ? ` · ${formatAssignedCoachLabel(user)}` : ""}
            </p>
          </div>
          <div className="client-hub-page__profile-badges">
            <UserTierBadge tier={user?.userTier} assignmentStatus={user?.assignmentStatus} />
            <span className="client-hub-page__joined">Joined {formatDate(user?.convertedAt || user?.createdAt)}</span>
          </div>
        </div>
        {showReassign && onReassign ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onReassign(user)}>
            Reassign
          </button>
        ) : null}
      </div>

      <div className="client-hub-tabs" role="tablist" aria-label="Client programs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`client-hub-panel-${tab.id}`}
              id={`client-hub-tab-${tab.id}`}
              className={`client-hub-tabs__btn${isActive ? " client-hub-tabs__btn--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        id={`client-hub-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`client-hub-tab-${activeTab}`}
        className="client-hub-page__panel"
      >
        {renderTab(activeTab, { embedded: true, user, onUserUpdated: () => setReloadKey((k) => k + 1) })}
      </div>
    </div>
  );
}
