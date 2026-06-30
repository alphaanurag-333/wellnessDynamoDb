import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useDispatch, useSelector } from "react-redux";
import { coachListAssistants } from "../../api/coachAssistants.js";
import { coachListHealUsers, coachReassignHealUser } from "../../api/coachHealUsers.js";
import { logoutCoach } from "../../../store/authSlice.js";
import { CoachPageLoadingState, CoachTableLoaderRow } from "../../components/CoachPageLoader.jsx";
import {
  formatAssignedCoachLabel,
  UserTierBadge,
} from "../../../components/ReferralAssignmentShared.jsx";

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
  const coach = useSelector((s) => s.auth.coach);
  const coachId = coach?._id || coach?.id;

  const [users, setUsers] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reassignUserId, setReassignUserId] = useState("");
  const [reassignAssistantId, setReassignAssistantId] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [scope, setScope] = useState("all");

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
        scope,
      });
      setUsers(rows);
    } catch (e) {
      if (e?.status === 401) dispatch(logoutCoach());
    } finally {
      setLoading(false);
    }
  }, [coachToken, debouncedSearch, dispatch, scope]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!coachToken) return;
    (async () => {
      try {
        const { assistants: rows } = await coachListAssistants(coachToken, { status: "active", limit: 100 });
        setAssistants(rows || []);
      } catch {
        setAssistants([]);
      }
    })();
  }, [coachToken]);

  const handleReassign = async (user) => {
    if (!coachToken || !coachId) return;
    const uid = user._id || user.id;
    setReassignUserId(uid);
    setReassignAssistantId("");
  };

  const submitReassign = async () => {
    if (!coachToken || !reassignUserId) return;
    setReassigning(true);
    try {
      const payload =
        reassignAssistantId && reassignAssistantId !== coachId
          ? {
              assignedCoachId: reassignAssistantId,
              assignedCoachType: "assistant_wellness_coach",
              parentCoachId: coachId,
            }
          : {
              assignedCoachId: coachId,
              assignedCoachType: "wellness_coach",
              parentCoachId: coachId,
            };

      await coachReassignHealUser(coachToken, reassignUserId, payload);
      await Swal.fire({ icon: "success", title: "User reassigned", timer: 1500 });
      setReassignUserId("");
      loadUsers();
    } catch (e) {
      if (e?.status === 401) dispatch(logoutCoach());
      else await Swal.fire({ icon: "error", title: "Failed", text: e.message || "Could not reassign." });
    } finally {
      setReassigning(false);
    }
  };

  return (
    <div className="page-card heal-users-page">
      <div className="page-card__head heal-users-page__head">
        <div className="heal-users-page__intro">
          <h2 className="page-card__title">My clients</h2>
          <p className="page-card__desc">
            Assigned clients in your team — Seek, consultancy, and Heal users with water and steps tracking.
          </p>
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
            <select
              className="user-list-status-select"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              aria-label="Filter clients"
            >
              <option value="all">All clients</option>
              <option value="direct">My direct clients</option>
              <option value="assistant">Assistant clients</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Phone</th>
              <th>Tier</th>
              <th>Assigned to</th>
              <th>Joined</th>
              <th className="data-table__actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <CoachTableLoaderRow colSpan={6} label="Loading clients…" />
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <p className="table-placeholder">No clients found for the current filters.</p>
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
                  <td>{formatAssignedCoachLabel(u)}</td>
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
                        to={`${u._id || u.id}/meal-tracking`}
                        className="btn btn--ghost btn--sm"
                      >
                        Meal tracking
                      </Link>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleReassign(u)}>
                        Reassign
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {reassignUserId ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3 className="modal-card__title">Reassign within your team</h3>
            <label className="user-field">
              <span className="user-field__label">Assign to</span>
              <select
                className="user-field__input"
                value={reassignAssistantId || coachId}
                onChange={(e) => setReassignAssistantId(e.target.value)}
              >
                <option value={coachId}>Myself (Wellness Coach)</option>
                {assistants.map((a) => (
                  <option key={a._id || a.id} value={a._id || a.id}>
                    {a.name} {a.designation ? `· ${a.designation}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-card__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setReassignUserId("")} disabled={reassigning}>
                Cancel
              </button>
              <button type="button" className="btn btn--primary" onClick={submitReassign} disabled={reassigning}>
                {reassigning ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
