import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetCoachAssistant, adminGetWellnessCoach } from "../../api/adminWellnessCoaches.js";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { WellnessCoachPageLoadingState } from "../wellnessCoach/WellnessCoachPageLoader.jsx";
import { formatDate, formatPhone, resolveAssistantId } from "./AssistantShared.js";
import { CopyReferralCode } from "../../../components/ReferralAssignmentShared.jsx";

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
      <AdminPageHeader
        title={assistant.name}
        onBack={() => navigate(`/admin/coaches/${coachId}`)}
        actions={
          <>
            <AdminStatusBadge status={assistant.status} />
            <Link to={`/admin/coaches/${coachId}/assistants/${aid}/edit`} className="btn btn--primary">
              Edit
            </Link>
          </>
        }
      />

      <div className="page-card user-view-card">
        <div className="user-view-head">
          <div className="user-view-avatar-wrap">
            <AdminMediaImage path={assistant.profileImage} round width={96} height={96} alt={assistant.name} />
          </div>
          <div className="user-view-grid">
            <DetailRow label="Wellness coach" value={coachName || coachId} />
            <DetailRow label="Email" value={assistant.email} />
            <DetailRow label="Mobile" value={formatPhone(assistant)} />
            <DetailRow label="Designation" value={assistant.designation} />
            <CopyReferralCode code={assistant.referralCode} label="Referral code" />
            <DetailRow label="Created" value={formatDate(assistant.createdAt)} />
            <DetailRow label="Updated" value={formatDate(assistant.updatedAt)} />
          </div>
        </div>
      </div>
    </div>
  );
}
