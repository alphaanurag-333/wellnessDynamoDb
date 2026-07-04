import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { PendingMealReviewCard } from "../../../components/PendingMealReviewCard.jsx";
import { CoachPageLoadingState } from "../../components/CoachPageLoader.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import {
  coachListPendingMealLogs,
  coachReviewMealLog,
} from "../../api/coachMealReview.js";

export function CoachMealApprovalsPage() {
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewingId, setReviewingId] = useState("");

  const load = useCallback(async () => {
    if (!coachToken) return;
    setError("");
    setLoading(true);
    try {
      const result = await coachListPendingMealLogs(coachToken);
      setLogs(result.logs ?? []);
    } catch (e) {
      if (e?.status === 401) dispatch(logoutCoach());
      else setError(e.message || "Failed to load pending meal logs.");
    } finally {
      setLoading(false);
    }
  }, [coachToken, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReview = async (log, payload) => {
    const logId = log.id || log._id;
    setReviewingId(logId);
    try {
      await coachReviewMealLog(coachToken, logId, payload);
      await Swal.fire({
        icon: "success",
        title: payload.status === "approved" ? "Meal approved" : "Meal rejected",
        timer: 1400,
        showConfirmButton: false,
      });
      await load();
    } catch (e) {
      if (e?.status === 401) dispatch(logoutCoach());
      else await Swal.fire({ icon: "error", title: "Review failed", text: e.message });
    } finally {
      setReviewingId("");
    }
  };

  if (loading) return <CoachPageLoadingState label="Loading pending meal logs…" />;

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
          {logs.length > 0 ? (
            <span className="meal-approvals-count">{logs.length} pending</span>
          ) : null}
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
