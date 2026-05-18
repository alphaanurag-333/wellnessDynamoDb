import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetWellnessCoach } from "../../api/adminWellnessCoaches.js";
import { logout } from "../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { WellnessCoachPageLoadingState } from "../wellnessCoach/WellnessCoachPageLoader.jsx";
import { AssistantForm } from "./AssistantForm.jsx";

export function AssistantAdd() {
  const { coachId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [coachName, setCoachName] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !coachId) return;
    let cancelled = false;
    (async () => {
      try {
        const coach = await adminGetWellnessCoach(adminToken, coachId);
        if (cancelled) return;
        if (!coach) {
          setNotFound(true);
          return;
        }
        setCoachName(coach.name || "");
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) dispatch(logout());
        else if (e?.status === 404) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, coachId, dispatch]);

  if (notFound) return <NotFoundPage />;
  if (loading) return <WellnessCoachPageLoadingState label="Loading…" />;

  return (
    <div className="user-page">
      <div className="user-page__toolbar">
        <button
          type="button"
          className="user-back-btn"
          aria-label="Back"
          onClick={() => navigate(`/admin/coaches/${coachId}`)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
        <div>
          <h2 className="user-page__title">Add assistant</h2>
          <p className="text-body-secondary small mb-0">Coach: {coachName}</p>
        </div>
      </div>
      <div className="user-page__card">
        <AssistantForm
          coachId={coachId}
          mode="create"
          submitLabel="Create assistant"
          onCancel={() => navigate(`/admin/coaches/${coachId}`)}
          onSuccess={async () => {
            await Swal.fire({ icon: "success", title: "Assistant created", timer: 1500 });
            navigate(`/admin/coaches/${coachId}`);
          }}
        />
      </div>
    </div>
  );
}
