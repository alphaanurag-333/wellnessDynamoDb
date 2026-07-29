import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { selectAdmin, selectIsCoachAccount } from "../../../store/authSelectors.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { AssistantForm } from "../assistantWellnessCoach/AssistantForm.jsx";

export function MyAssistantsAdd() {
  const navigate = useNavigate();
  const admin = useSelector(selectAdmin);
  const isCoach = useSelector(selectIsCoachAccount);
  const coachId = String(admin?.id || admin?._id || "");

  if (!isCoach || !coachId) return <p className="table-placeholder">This section is available to wellness coaches only.</p>;

  return (
    <div className="user-page">
      <AdminPageHeader title="Add assistant" onBack={() => navigate("/admin/my-assistants")} />
      <div className="user-page__card">
        <AssistantForm
          coachId={coachId}
          mode="create"
          submitLabel="Create assistant"
          onCancel={() => navigate("/admin/my-assistants")}
          onSuccess={async () => {
            await Swal.fire({ icon: "success", title: "Assistant created", timer: 1500 });
            navigate("/admin/my-assistants");
          }}
        />
      </div>
    </div>
  );
}
