import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { assistantListHealUsers } from "../../api/assistantHealUsers.js";
import { logoutAssistant } from "../../../store/authSlice.js";
import { CoachTableLoaderRow } from "../../../wellnessCoach/components/CoachPageLoader.jsx";

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
          <p className="page-card__desc">Paid users assigned directly to you.</p>
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
              <th>Joined</th>
              <th className="data-table__actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <CoachTableLoaderRow colSpan={4} label="Loading clients…" />
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4}>
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
                  <td>{formatDate(u.convertedAt || u.createdAt)}</td>
                  <td>
                    <div className="row-actions row-actions--text">
                      <Link
                        to={`${u._id || u.id}/water-tracking`}
                        className="btn btn--ghost btn--sm"
                      >
                        Water history
                      </Link>
                      <Link
                        to={`${u._id || u.id}/steps-tracking`}
                        className="btn btn--ghost btn--sm"
                      >
                        Steps history
                      </Link>
                      <Link
                        to={`${u._id || u.id}/reminders`}
                        className="btn btn--ghost btn--sm"
                      >
                        Reminders
                      </Link>
                      <Link
                        to={`${u._id || u.id}/diet-plan`}
                        className="btn btn--ghost btn--sm"
                      >
                        Diet plan
                      </Link>
                      <Link
                        to={`${u._id || u.id}/test-recommendations`}
                        className="btn btn--ghost btn--sm"
                      >
                        Internal parameters
                      </Link>
                      <Link
                        to={`${u._id || u.id}/physical-exercises`}
                        className="btn btn--ghost btn--sm"
                      >
                        Physical exercises
                      </Link>
                      <Link
                        to={`${u._id || u.id}/meal-tracking`}
                        className="btn btn--ghost btn--sm"
                      >
                        Meal tracking
                      </Link>
                    </div>
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
