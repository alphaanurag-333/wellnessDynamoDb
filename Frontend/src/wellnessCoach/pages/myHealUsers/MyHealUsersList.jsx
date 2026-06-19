import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useDispatch, useSelector } from "react-redux";
import { coachListAssistants } from "../../api/coachAssistants.js";
import { coachListHealUsers, coachReassignHealUser } from "../../api/coachHealUsers.js";
import { logoutCoach } from "../../../store/authSlice.js";
import { CoachPageLoadingState } from "../../components/CoachPageLoader.jsx";
import {
  formatAssignedCoachLabel,
  UserTierBadge,
} from "../../../components/ReferralAssignmentShared.jsx";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { dateStyle: "medium" });
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
    <div className="page-card">
      <div className="page-card__head">
        <div>
          <h2 className="page-card__title">My Heal clients</h2>
          <p className="page-card__subtitle">All paid users under your coaching hierarchy (direct + assistants).</p>
        </div>
        <div className="search-field">
          <input
            type="search"
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search clients"
          />
        </div>
      </div>

      {loading ? (
        <CoachPageLoadingState label="Loading clients…" />
      ) : (
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
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6}>No Heal clients found.</td>
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
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleReassign(u)}>
                        Reassign
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

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
