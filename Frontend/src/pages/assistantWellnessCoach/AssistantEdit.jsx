import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetCoachAssistant } from "../../api/adminWellnessCoaches.js";
import { logout } from "../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { WellnessCoachPageLoadingState } from "../wellnessCoach/WellnessCoachPageLoader.jsx";
import { AssistantForm } from "./AssistantForm.jsx";
import { resolveAssistantId } from "./AssistantShared.js";

export function AssistantEdit() {
  const { coachId, assistantId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [assistant, setAssistant] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!adminToken || !coachId || !assistantId) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await adminGetCoachAssistant(adminToken, coachId, assistantId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setAssistant(row);
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
        setLoadError(e.message || "Failed to load assistant.");
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
  if (loadError) {
    return (
      <div className="user-page">
        <p className="user-list-error">{loadError}</p>
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
          onClick={() => navigate(`/admin/coaches/${coachId}/assistants/${aid}`)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
        <div>
          <h2 className="user-page__title">Edit assistant</h2>
        </div>
      </div>
      <div className="user-page__card">
        <AssistantForm
          key={aid}
          coachId={coachId}
          mode="edit"
          assistantId={aid}
          initialAssistant={assistant}
          submitLabel="Save changes"
          onCancel={() => navigate(`/admin/coaches/${coachId}/assistants/${aid}`)}
          onSuccess={async () => {
            await Swal.fire({ icon: "success", title: "Assistant updated", timer: 1500 });
            navigate(`/admin/coaches/${coachId}/assistants/${aid}`);
          }}
        />
      </div>
    </div>
  );
}
