import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetWellnessCoach } from "../../api/adminWellnessCoaches.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { WellnessCoachForm } from "./WellnessCoachForm.jsx";
import { WellnessCoachPageLoadingState } from "./WellnessCoachPageLoader.jsx";

export function WellnessCoachEdit() {
  const { coachId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [coach, setCoach] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!adminToken || !coachId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
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
        setLoadError(e.message || "Failed to load coach.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, coachId, dispatch]);

  if (notFound) return <NotFoundPage />;
  if (loading) return <WellnessCoachPageLoadingState label="Loading coach…" />;
  if (loadError) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {loadError}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
    );
  }
  if (!coach) return null;

  return (
    <div className="user-page">
      <div className="user-page__toolbar">
        <button type="button" className="user-back-btn" aria-label="Back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
        <div>
          <h2 className="user-page__title">Edit wellness coach</h2>
        </div>
      </div>
      <div className="user-page__card">
        <WellnessCoachForm
          key={coach.id}
          mode="edit"
          coachId={coach.id}
          initialCoach={coach}
          submitLabel="Save changes"
          onCancel={() => navigate(`/admin/coaches/${coach.id}`)}
          onSuccess={async () => {
            await Swal.fire({ icon: "success", title: "Coach updated", timer: 1500 });
            navigate(`/admin/coaches/${coach.id}`);
          }}
        />
      </div>
    </div>
  );
}
