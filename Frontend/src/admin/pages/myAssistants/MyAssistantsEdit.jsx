import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { logout } from "../../../store/authSlice.js";
import { selectAdmin, selectIsCoachAccount } from "../../../store/authSelectors.js";
import { adminGetCoachAssistant } from "../../api/adminWellnessCoaches.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AssistantForm } from "../assistantWellnessCoach/AssistantForm.jsx";
import { resolveAssistantId } from "../assistantWellnessCoach/AssistantShared.js";
import { WellnessCoachPageLoadingState } from "../wellnessCoach/WellnessCoachPageLoader.jsx";

export function MyAssistantsEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((state) => state.auth.adminToken);
  const admin = useSelector(selectAdmin);
  const isCoach = useSelector(selectIsCoachAccount);
  const coachId = String(admin?.id || admin?._id || "");
  const [assistant, setAssistant] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !coachId || !id || !isCoach) return;
    adminGetCoachAssistant(adminToken, coachId, id).then(setAssistant).catch((err) => {
      if (err?.status === 401) dispatch(logout());
      else if (err?.status === 404) setNotFound(true);
      else setError(err.message || "Failed to load assistant.");
    });
  }, [adminToken, coachId, dispatch, id, isCoach]);

  if (!isCoach) return <NotFoundPage />;
  if (notFound) return <NotFoundPage />;
  if (error) return <p className="user-list-error">{error}</p>;
  if (!assistant) return <WellnessCoachPageLoadingState label="Loading assistant…" />;
  const assistantId = resolveAssistantId(assistant);

  return (
    <div className="user-page">
      <AdminPageHeader title="Edit assistant" onBack={() => navigate(`/admin/my-assistants/${assistantId}`)} />
      <div className="user-page__card">
        <AssistantForm
          coachId={coachId}
          assistantId={assistantId}
          initialAssistant={assistant}
          mode="edit"
          submitLabel="Save changes"
          onCancel={() => navigate(`/admin/my-assistants/${assistantId}`)}
          onSuccess={async () => {
            await Swal.fire({ icon: "success", title: "Assistant updated", timer: 1500 });
            navigate(`/admin/my-assistants/${assistantId}`);
          }}
        />
      </div>
    </div>
  );
}
