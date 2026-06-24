import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { IoEyeSharp } from "react-icons/io5";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete } from "react-icons/ai";
import {
  adminDeleteCoachAssistant,
  adminGetWellnessCoach,
  adminListCoachAssistants,
  adminUpdateCoachAssistant,
  adminUpdateWellnessCoachApproval,
  resolveCoachId,
} from "../../api/adminWellnessCoaches.js";
import { adminListHealUsersByCoach } from "../../api/adminUserAssignment.js";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { formatDate, formatPhone } from "./WellnessCoachShared.js";
import { WellnessCoachPageLoadingState, WellnessCoachTableLoaderRow } from "./WellnessCoachPageLoader.jsx";
import { resolveAssistantId } from "../assistantWellnessCoach/AssistantShared.js";
import { CopyReferralCode, UserTierBadge, formatAssignedCoachLabel } from "../../../components/ReferralAssignmentShared.jsx";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function WellnessCoachView() {
  const { coachId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [coach, setCoach] = useState(null);
  const [assistants, setAssistants] = useState([]);
  const [healUsers, setHealUsers] = useState([]);
  const [loadingAssistants, setLoadingAssistants] = useState(false);
  const [loadingHealUsers, setLoadingHealUsers] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingAssistantId, setTogglingAssistantId] = useState("");
  const [approvingCoach, setApprovingCoach] = useState(false);

  const loadAssistants = useCallback(async () => {
    if (!adminToken || !coachId) return;
    setLoadingAssistants(true);
    try {
      const { assistants: rows } = await adminListCoachAssistants(adminToken, coachId, {
        limit: 50,
      });
      setAssistants(rows);
    } catch (e) {
      if (e?.status === 401) dispatch(logout());
    } finally {
      setLoadingAssistants(false);
    }
  }, [adminToken, coachId, dispatch]);

  useEffect(() => {
    if (!adminToken || !coachId) return;
    let cancelled = false;
    (async () => {
      setError("");
      setLoading(true);
      try {
        const row = await adminGetWellnessCoach(adminToken, coachId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setCoach(row);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) {
          dispatch(logout());
          return;
        }
        if (e?.status === 404) {
          setNotFound(true);
          return;
        }
        setError(e.message || "Failed to load coach.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, coachId, dispatch]);

  const loadHealUsers = useCallback(async () => {
    if (!adminToken || !coachId) return;
    setLoadingHealUsers(true);
    try {
      const { users } = await adminListHealUsersByCoach(adminToken, coachId, { limit: 50 });
      setHealUsers(users || []);
    } catch (e) {
      if (e?.status === 401) dispatch(logout());
    } finally {
      setLoadingHealUsers(false);
    }
  }, [adminToken, coachId, dispatch]);

  useEffect(() => {
    if (coach) loadAssistants();
  }, [coach, loadAssistants]);

  useEffect(() => {
    if (coach) loadHealUsers();
  }, [coach, loadHealUsers]);

  const handleToggleAssistantStatus = async (assistant) => {
    if (!adminToken || !coachId) return;
    const aid = resolveAssistantId(assistant);
    const nextStatus = assistant.status === "active" ? "inactive" : "active";
    setTogglingAssistantId(aid);
    try {
      await adminUpdateCoachAssistant(adminToken, coachId, aid, { status: nextStatus });
      await Swal.fire({ icon: "success", title: "Status updated", timer: 1200 });
      loadAssistants();
    } catch (e) {
      if (e?.status === 401) dispatch(logout());
      else await Swal.fire({ icon: "error", title: "Update failed", text: e.message });
    } finally {
      setTogglingAssistantId("");
    }
  };

  const handleApproveCoach = async (approvalStatus) => {
    if (!adminToken || !coachId) return;
    const label = approvalStatus === "approved" ? "Approve" : approvalStatus === "rejected" ? "Reject" : "Set Pending";
    const { isConfirmed } = await Swal.fire({
      title: `${label} coach?`,
      html: `<strong>${coach?.name || coach?.email}</strong> will be set to <strong>${approvalStatus}</strong>.`,
      icon: approvalStatus === "approved" ? "question" : "warning",
      showCancelButton: true,
      confirmButtonText: label,
      confirmButtonColor: approvalStatus === "approved" ? "#16a34a" : "#dc2626",
    });
    if (!isConfirmed) return;
    setApprovingCoach(true);
    try {
      const updated = await adminUpdateWellnessCoachApproval(adminToken, coachId, approvalStatus);
      setCoach(updated);
      await Swal.fire({ icon: "success", title: `Coach ${approvalStatus}`, timer: 1500 });
    } catch (e) {
      if (e?.status === 401) dispatch(logout());
      else await Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setApprovingCoach(false);
    }
  };

  const handleDeleteAssistant = async (assistant) => {
    const aid = resolveAssistantId(assistant);
    const { isConfirmed } = await Swal.fire({
      title: "Delete assistant?",
      text: assistant.name || assistant.email,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed || !adminToken) return;
    try {
      await adminDeleteCoachAssistant(adminToken, coachId, aid);
      await Swal.fire({ icon: "success", title: "Assistant deleted", timer: 1200 });
      loadAssistants();
    } catch (e) {
      if (e?.status === 401) dispatch(logout());
      else await Swal.fire({ icon: "error", title: "Delete failed", text: e.message });
    }
  };

  if (notFound) return <NotFoundPage />;
  if (loading) return <WellnessCoachPageLoadingState label="Loading coach…" />;
  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error">{error}</p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
    );
  }
  if (!coach) return null;

  const id = resolveCoachId(coach);

  return (
    <div className="user-page">
      <div className="user-page__toolbar">
        <button type="button" className="user-back-btn" aria-label="Back" onClick={() => navigate("/admin/coaches")}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">{coach.name}</h2>
          <span className={`status-pill status-pill--${coach.status === "active" ? "active" : "inactive"}`}>
            {coach.status}
          </span>
          <span className={`approval-badge approval-badge--${coach.approvalStatus || "approved"}`}>
            {coach.approvalStatus || "approved"}
          </span>
        </div>
        <div className="user-page__toolbar-actions">
          {(coach.approvalStatus === "pending" || coach.approvalStatus === "rejected") && (
            <button
              type="button"
              className="btn btn--success"
              disabled={approvingCoach}
              onClick={() => handleApproveCoach("approved")}
            >
              Approve
            </button>
          )}
          {(coach.approvalStatus === "pending" || coach.approvalStatus === "approved" || !coach.approvalStatus) && (
            <button
              type="button"
              className="btn btn--danger"
              disabled={approvingCoach}
              onClick={() => handleApproveCoach("rejected")}
            >
              Reject
            </button>
          )}
          <Link to={`/admin/coaches/${id}/edit`} className="btn btn--primary">
            Edit coach
          </Link>
        </div>
      </div>

      <div className="user-page__card user-detail-grid">
        <div className="user-detail-profile">
          <AdminMediaImage path={coach.profileImage} round width={96} height={96} alt={coach.name} />
        </div>
        <div className="user-detail-fields">
          <DetailRow label="Email" value={coach.email} />
          <DetailRow label="Mobile" value={formatPhone(coach)} />
          <DetailRow label="Specialization" value={coach.specializationTitle} />
          <DetailRow label="Location" value={[coach.city, coach.state, coach.country].filter(Boolean).join(", ")} />
          <DetailRow label="Bio" value={coach.bio} />
          <CopyReferralCode code={coach.referralCode} label="Referral code" />
          <DetailRow label="Approval Status" value={coach.approvalStatus || "approved"} />
          <DetailRow label="Created" value={formatDate(coach.createdAt)} />
          <DetailRow label="Updated" value={formatDate(coach.updatedAt)} />
        </div>
      </div>

      <div className="page-card" style={{ marginTop: 24 }}>
        <div className="page-card__head">
          <h3 className="page-card__title">Assigned clients (direct + via assistants)</h3>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Assigned to</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingHealUsers ? (
                <WellnessCoachTableLoaderRow colSpan={4} />
              ) : healUsers.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <p className="table-placeholder">No assigned clients under this coach yet.</p>
                  </td>
                </tr>
              ) : (
                healUsers.map((u) => (
                  <tr key={u._id || u.id}>
                    <td>{u.name}</td>
                    <td className="data-table__mono">{u.email}</td>
                    <td>{formatAssignedCoachLabel(u)}</td>
                    <td>
                      <UserTierBadge tier={u.userTier} assignmentStatus={u.assignmentStatus} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="page-card" style={{ marginTop: 24 }}>
        <div className="page-card__head">
          <h3 className="page-card__title">Assistant staff (AWC)</h3>
          <Link to={`/admin/coaches/${id}/assistants/new`} className="btn btn--accent">
            + Add assistant
          </Link>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Designation</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingAssistants ? (
                <WellnessCoachTableLoaderRow colSpan={6} />
              ) : assistants.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <p className="table-placeholder">No assistants yet.</p>
                  </td>
                </tr>
              ) : (
                assistants.map((a) => {
                  const aid = resolveAssistantId(a);
                  return (
                    <tr key={aid}>
                      <td>{a.name}</td>
                      <td className="data-table__mono">{a.email}</td>
                      <td>{formatPhone(a)}</td>
                      <td>{a.designation || "—"}</td>
                      <td>
                        <button
                          type="button"
                          className={`settings-switch${a.status === "active" ? " settings-switch--on" : ""}`}
                          role="switch"
                          aria-checked={a.status === "active"}
                          aria-label={`Toggle status for ${a.name || a.email}`}
                          onClick={() => handleToggleAssistantStatus(a)}
                          disabled={togglingAssistantId === aid}
                          title={a.status === "active" ? "Deactivate assistant" : "Activate assistant"}
                        >
                          <span className="settings-switch__knob" aria-hidden />
                        </button>
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link
                            to={`/admin/coaches/${id}/assistants/${aid}`}
                            className="icon-btn icon-btn--view"
                            title="View"
                          >
                            <IoEyeSharp size={18} />
                          </Link>
                          <Link
                            to={`/admin/coaches/${id}/assistants/${aid}/edit`}
                            className="icon-btn icon-btn--edit"
                            title="Edit"
                          >
                            <MdEditSquare size={18} />
                          </Link>
                          <button
                            type="button"
                            className="icon-btn icon-btn--delete"
                            title="Delete"
                            onClick={() => handleDeleteAssistant(a)}
                          >
                            <AiFillDelete size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
