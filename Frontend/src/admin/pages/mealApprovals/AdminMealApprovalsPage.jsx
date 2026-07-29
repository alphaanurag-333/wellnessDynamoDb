import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { PendingMealReviewCard } from "../../../components/PendingMealReviewCard.jsx";
import { logout } from "../../../store/authSlice.js";
import { adminListPendingMealLogs, adminReviewMealLog } from "../../api/adminMealReview.js";
import { WellnessCoachPageLoadingState } from "../wellnessCoach/WellnessCoachPageLoader.jsx";

export function AdminMealApprovalsPage() {
  const dispatch = useDispatch();
  const adminToken = useSelector((state) => state.auth.adminToken);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewingId, setReviewingId] = useState("");

  const load = useCallback(async () => {
    if (!adminToken) return;
    setError("");
    setLoading(true);
    try {
      const result = await adminListPendingMealLogs(adminToken);
      setLogs(result.logs ?? []);
    } catch (err) {
      if (err?.status === 401) dispatch(logout());
      else setError(err.message || "Failed to load pending meal logs.");
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReview = async (log, payload) => {
    const logId = log.id || log._id;
    setReviewingId(logId);
    try {
      await adminReviewMealLog(adminToken, logId, payload);
      await Swal.fire({
        icon: "success",
        title: payload.status === "approved" ? "Meal approved" : "Meal rejected",
        timer: 1400,
        showConfirmButton: false,
      });
      await load();
    } catch (err) {
      if (err?.status === 401) dispatch(logout());
      else await Swal.fire({ icon: "error", title: "Review failed", text: err.message });
    } finally {
      setReviewingId("");
    }
  };

  if (loading) return <WellnessCoachPageLoadingState label="Loading pending meal logs…" />;

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <div>
            <h2 className="page-card__title">Pending meal approvals</h2>
            <p className="page-card__desc">
              Review client meal logs, adjust macros if needed, then approve or reject.
            </p>
          </div>
          {logs.length > 0 ? <span className="meal-approvals-count">{logs.length} pending</span> : null}
        </div>
        {error ? <p className="user-list-error">{error}</p> : null}
        {!error && logs.length === 0 ? (
          <p className="table-placeholder">No pending meal logs right now.</p>
        ) : (
          <div className="mt-pending-grid">
            {logs.map((log) => (
              <PendingMealReviewCard
                key={log.id || log._id}
                log={log}
                reviewing={reviewingId === (log.id || log._id)}
                onReview={handleReview}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
