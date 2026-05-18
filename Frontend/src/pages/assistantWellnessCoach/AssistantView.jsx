import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetCoachAssistant, adminGetWellnessCoach } from "../../api/adminWellnessCoaches.js";
import { logout } from "../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { WellnessCoachPageLoadingState } from "../wellnessCoach/WellnessCoachPageLoader.jsx";
import { formatDate, formatPhone, resolveAssistantId } from "./AssistantShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function AssistantView() {
  const { coachId, assistantId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [assistant, setAssistant] = useState(null);
  const [coachName, setCoachName] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !coachId || !assistantId) return;
    let cancelled = false;
    (async () => {
      try {
        const [row, coach] = await Promise.all([
          adminGetCoachAssistant(adminToken, coachId, assistantId),
          adminGetWellnessCoach(adminToken, coachId).catch(() => null),
        ]);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setAssistant(row);
        setCoachName(coach?.name || "");
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
        setError(e.message || "Failed to load assistant.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, assistantId, coachId, dispatch]);

  if (notFound) return <NotFoundPage />;
  if (loading) return <WellnessCoachPageLoadingState label="Loading assistant…" />;
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
  if (!assistant) return null;

  const aid = resolveAssistantId(assistant);

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
        <div className="user-page__toolbar-main">
          <h2 className="user-page__title">{assistant.name}</h2>
          <span className={`status-pill status-pill--${assistant.status === "active" ? "active" : "inactive"}`}>
            {assistant.status}
          </span>
        </div>
        <Link to={`/admin/coaches/${coachId}/assistants/${aid}/edit`} className="btn btn--primary">
          Edit
        </Link>
      </div>

      <div className="user-page__card user-detail-grid">
        <div className="user-detail-profile">
          <AdminMediaImage path={assistant.profileImage} round width={96} height={96} alt={assistant.name} />
        </div>
        <div className="user-detail-fields">
          <DetailRow label="Wellness coach" value={coachName || coachId} />
          <DetailRow label="Email" value={assistant.email} />
          <DetailRow label="Mobile" value={formatPhone(assistant)} />
          <DetailRow label="Designation" value={assistant.designation} />
          <DetailRow label="Created" value={formatDate(assistant.createdAt)} />
          <DetailRow label="Updated" value={formatDate(assistant.updatedAt)} />
        </div>
      </div>
    </div>
  );
}
