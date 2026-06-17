import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { coachGetAssistant } from "../../api/coachAssistants.js";
import { NotFoundPage } from "../../../admin/pages/NotFoundPage.jsx";
import { CoachPageLoadingState } from "../../components/CoachPageLoader.jsx";
import { logoutCoach } from "../../../store/authSlice.js";
import { MyAssistantForm } from "./MyAssistantForm.jsx";
import { resolveAssistantId } from "./MyAssistantShared.js";

export function MyAssistantEdit() {
  const { assistantId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const coachToken = useSelector((s) => s.auth.coachToken);
  const [assistant, setAssistant] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!coachToken || !assistantId) return;
    let cancelled = false;
    (async () => {
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
        setLoadError(e.message || "Failed to load assistant.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coachToken, assistantId, dispatch]);

  if (notFound) return <NotFoundPage />;
  if (loading) return <CoachPageLoadingState label="Loading assistant…" />;
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
          onClick={() => navigate(`/coach/my-assistants/${aid}`)}
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
        <MyAssistantForm
          key={aid}
          mode="edit"
          assistantId={aid}
          initialAssistant={assistant}
          submitLabel="Save changes"
          onCancel={() => navigate(`/coach/my-assistants/${aid}`)}
          onSuccess={async () => {
            await Swal.fire({ icon: "success", title: "Assistant updated", timer: 1500 });
            navigate(`/coach/my-assistants/${aid}`);
          }}
        />
      </div>
    </div>
  );
}
