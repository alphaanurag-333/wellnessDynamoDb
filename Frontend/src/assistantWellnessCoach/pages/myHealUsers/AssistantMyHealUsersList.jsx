import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { assistantListHealUsers } from "../../api/assistantHealUsers.js";
import { logoutAssistant } from "../../../store/authSlice.js";
import { CoachTableLoaderRow } from "../../../wellnessCoach/components/CoachPageLoader.jsx";
import { UserTierBadge } from "../../../components/ReferralAssignmentShared.jsx";
import { ClientListRowStats } from "../../../components/ClientListRowStats.jsx";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function SearchIcon() {
  return (
    <span className="search-field__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    </span>
  );
}

export function AssistantMyHealUsersList() {
  const dispatch = useDispatch();
  const assistantToken = useSelector((s) => s.auth.assistantToken);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadUsers = useCallback(async () => {
    if (!assistantToken) {
      setLoading(false);
      return;
    }
    setLoadError("");
    setLoading(true);
    try {
      const { users: rows } = await assistantListHealUsers(assistantToken, {
        limit: 100,
        search: debouncedSearch || undefined,
      });
      setUsers(rows);
    } catch (e) {
      if (e?.status === 401) dispatch(logoutAssistant());
      else setLoadError(e.message || "Failed to load clients.");
    } finally {
      setLoading(false);
    }
  }, [assistantToken, debouncedSearch, dispatch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <div className="page-card heal-users-page">
      <div className="page-card__head heal-users-page__head">
        <div className="heal-users-page__intro">
          <h2 className="page-card__title">My clients</h2>
          <p className="page-card__desc">Heal clients assigned directly to you — track LAUNCH scores, diet, and more.</p>
        </div>
        <div className="page-card__actions user-list-toolbar heal-users-page__toolbar">
          <div className="user-list-filters heal-users-page__filters">
            <div className="search-field heal-users-page__search">
              <SearchIcon />
              <input
                type="search"
                placeholder="Search name, email, phone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search clients"
              />
            </div>
          </div>
        </div>
      </div>

      {loadError ? (
        <p className="user-list-error" role="alert">
          {loadError}
        </p>
      ) : null}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Phone</th>
              <th>Tier</th>
              <th>Joined</th>
              <th>Programs</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <CoachTableLoaderRow colSpan={5} label="Loading clients…" />
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <p className="table-placeholder">No clients assigned to you yet.</p>
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id || u.id}>
                  <td>
                    <div className="data-table__primary">{u.name || "—"}</div>
                    <div className="data-table__muted">{u.email}</div>
                  </td>
                  <td>{[u.phoneCountryCode, u.phone].filter(Boolean).join(" ") || "—"}</td>
                  <td>
                    <UserTierBadge tier={u.userTier} assignmentStatus={u.assignmentStatus} />
                  </td>
                  <td>{formatDate(u.convertedAt || u.createdAt)}</td>
                  <td>
                    <ClientListRowStats user={u} viewPath={`${u._id || u.id}`} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
