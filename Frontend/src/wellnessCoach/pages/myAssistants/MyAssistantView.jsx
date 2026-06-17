import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { coachDeleteAssistant, coachGetAssistant } from "../../api/coachAssistants.js";
import { AdminMediaImage } from "../../../admin/components/AdminMediaImage.jsx";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { CoachPageLoadingState } from "../../components/CoachPageLoader.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import { formatDate, formatPhone, resolveAssistantId } from "./MyAssistantShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function MyAssistantView() {
  const { assistantId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);
  const [assistant, setAssistant] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!coachToken || !assistantId) return;
    let cancelled = false;
    (async () => {
      setError("");
      setLoading(true);
      try {
        const row = await coachGetAssistant(coachToken, assistantId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setAssistant(row);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) {
          dispatch(logoutCoach());
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
  }, [coachToken, assistantId, dispatch]);

  const handleDelete = async () => {
    const { isConfirmed } = await Swal.fire({
      title: "Delete assistant?",
      text: assistant?.name || assistant?.email,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed || !coachToken) return;
    try {
      await coachDeleteAssistant(coachToken, assistantId);
      await Swal.fire({ icon: "success", title: "Assistant deleted", timer: 1500 });
      navigate("/coach/my-assistants");
    } catch (e) {
      if (e?.status === 401) {
        dispatch(logoutCoach());
        return;
      }
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message });
    }
  };

  if (notFound) return <NotFoundPage />;
  if (loading) return <CoachPageLoadingState label="Loading assistant…" />;
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
          onClick={() => navigate("/coach/my-assistants")}
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
        <div className="d-flex flex-wrap gap-2">
          <Link to={`/coach/my-assistants/${aid}/edit`} className="btn btn--primary">
            Edit
          </Link>
          <button type="button" className="btn btn--danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="user-page__card user-detail-grid">
        <div className="user-detail-profile">
          <AdminMediaImage path={assistant.profileImage} round width={96} height={96} alt={assistant.name} />
        </div>
        <div className="user-detail-fields">
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
