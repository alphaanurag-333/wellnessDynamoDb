import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { coachListHealUsers } from "../../api/coachHealUsers.js";
import { logoutCoach } from "../../../store/authSlice.js";
import { CoachPageLoadingState, CoachTableLoaderRow } from "../../components/CoachPageLoader.jsx";
import {
  formatAssignedCoachLabel,
  UserTierBadge,
} from "../../../components/ReferralAssignmentShared.jsx";
import {
  ClientListRowActions,
  ClientListRowPrograms,
  ClientTableUserCell,
} from "../../../components/ClientListRowStats.jsx";

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

export function MyHealUsersList() {
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadUsers = useCallback(async () => {
    if (!coachToken) return;
    setLoading(true);
    try {
      const { users: rows } = await coachListHealUsers(coachToken, {
        limit: 100,
        search: debouncedSearch || undefined,
        scope: "direct",
      });
      setUsers(rows);
    } catch (e) {
      if (e?.status === 401) dispatch(logoutCoach());
    } finally {
      setLoading(false);
    }
  }, [coachToken, debouncedSearch, dispatch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <div className="page-card heal-users-page">
      <div className="page-card__head heal-users-page__head">
        <div className="heal-users-page__intro">
          <h2 className="page-card__title">My clients</h2>
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

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>S No.</th>
              <th>Client</th>
              <th>Phone</th>
              <th>Tier</th>
              <th>Assigned to</th>
              <th>Joined</th>
              <th>Modules</th>
              <th className="data-table__actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <CoachTableLoaderRow colSpan={8} label="Loading clients…" />
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <p className="table-placeholder">No clients found for the current filters.</p>
                </td>
              </tr>
            ) : (
              users.map((u, idx) => (
                <tr key={u._id || u.id}>
                  <td className="data-table__muted">{idx + 1}</td>
                  <td>
                    <ClientTableUserCell user={u} />
                  </td>
                  <td>
                    <div className="user-cell__muted">
                      {[u.phoneCountryCode, u.phone].filter(Boolean).join(" ") || "—"}
                    </div>
                  </td>
                  <td>
                    <UserTierBadge tier={u.userTier} assignmentStatus={u.assignmentStatus} />
                  </td>
                  <td>{formatAssignedCoachLabel(u)}</td>
                  <td className="data-table__muted">{formatDate(u.convertedAt || u.createdAt)}</td>
                  <td>
                    <ClientListRowPrograms user={u} />
                  </td>
                  <td className="data-table__actions-col">
                    <ClientListRowActions user={u} viewPath={`${u._id || u.id}`} />
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
