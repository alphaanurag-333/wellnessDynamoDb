import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { adminDeleteDietPlan, adminListUserDietPlans } from "../../api/adminDietPlans.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { UserPageLoadingState } from "./UserPageLoader.jsx";

function formatPlanDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase()
    .replace(",", ",");
}

function DietPlanRow({ plan, onDelete, deleting }) {
  const planId = plan.id || plan._id;
  const fileUrl = plan.fileUrl;

  return (
    <tr>
      <td>
        <div className="data-table__primary">{plan.title || "Diet Plan"}</div>
        {plan.note ? <div className="data-table__muted">{plan.note}</div> : null}
      </td>
      <td>{formatPlanDate(plan.createdAt)}</td>
      <td>{plan.createdByRole === "assistant_wellness_coach" ? "Assistant coach" : "Wellness coach"}</td>
      <td>
        <div className="row-actions row-actions--text">
          {fileUrl ? (
            <>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
                View
              </a>
              <a href={fileUrl} download className="btn btn--ghost btn--sm">
                Download
              </a>
            </>
          ) : (
            "—"
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm text-danger"
            onClick={() => onDelete(planId)}
            disabled={deleting}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export function AdminUserDietPlanPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [user, setUser] = useState(null);
  const [recommended, setRecommended] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const loadPlans = useCallback(async () => {
    if (!adminToken || !userId) return;
    setError("");
    setNotFound(false);
    setLoading(true);
    try {
      const result = await adminListUserDietPlans(adminToken, userId);
      setUser(result.user);
      setRecommended(result.recommended ?? null);
      setHistory(result.history ?? []);
    } catch (e) {
      if (e?.status === 401) {
        dispatch(logout());
        return;
      }
      if (e?.status === 404) {
        setNotFound(true);
        return;
      }
      setError(e.message || "Failed to load diet plans.");
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, userId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleDelete = async (planId) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Delete diet plan?",
      text: "This will permanently remove the PDF.",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!confirm.isConfirmed) return;

    setDeletingId(planId);
    try {
      await adminDeleteDietPlan(adminToken, planId);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
      await loadPlans();
    } catch (e) {
      if (e?.status === 401) dispatch(logout());
      else await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete diet plan." });
    } finally {
      setDeletingId("");
    }
  };

  if (notFound) return <NotFoundPage />;
  if (loading) return <UserPageLoadingState label="Loading diet plans…" />;

  const allPlans = [recommended, ...history].filter(Boolean);

  return (
    <div className="user-page">
      <div className="user-page__toolbar">
        <button type="button" className="user-back-btn" aria-label="Back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">Diet plans</h2>
          {user ? (
            <p className="page-card__desc">
              {user.name} · {user.email}
            </p>
          ) : null}
        </div>
        <div className="user-page__toolbar-actions">
          <Link to={`/admin/users/${userId}`} className="btn btn--ghost">
            User details
          </Link>
        </div>
      </div>

      {error ? (
        <p className="user-list-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="page-card">
        <h3 className="form-card__title">Recommended diet plan</h3>
        {recommended ? (
          <div className="diet-plan-card">
            <div className="diet-plan-card__body">
              <div className="diet-plan-card__title">{recommended.title || "Diet Plan"}</div>
              <div className="diet-plan-card__date">{formatPlanDate(recommended.createdAt)}</div>
            </div>
            <div className="diet-plan-card__actions">
              {recommended.fileUrl ? (
                <>
                  <a href={recommended.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
                    View
                  </a>
                  <a href={recommended.fileUrl} download className="btn btn--primary btn--sm">
                    Download
                  </a>
                </>
              ) : null}
              <button
                type="button"
                className="btn btn--ghost btn--sm text-danger"
                onClick={() => handleDelete(recommended.id || recommended._id)}
                disabled={deletingId === (recommended.id || recommended._id)}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <p className="table-placeholder">No diet plan uploaded yet.</p>
        )}
      </div>

      <div className="page-card" style={{ marginTop: "1rem" }}>
        <h3 className="form-card__title">All diet plans</h3>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Date</th>
                <th>Uploaded by</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allPlans.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <p className="table-placeholder">No diet plans for this user.</p>
                  </td>
                </tr>
              ) : (
                allPlans.map((plan) => (
                  <DietPlanRow
                    key={plan.id || plan._id}
                    plan={plan}
                    onDelete={handleDelete}
                    deleting={deletingId === (plan.id || plan._id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
