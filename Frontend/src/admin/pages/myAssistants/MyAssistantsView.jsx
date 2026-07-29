import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { logout } from "../../../store/authSlice.js";
import { selectAdmin, selectIsCoachAccount } from "../../../store/authSelectors.js";
import { adminDeleteCoachAssistant, adminGetCoachAssistant } from "../../api/adminWellnessCoaches.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { useResourcePermissions } from "../../hooks/useHasPermission.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { formatDate, formatPhone } from "../assistantWellnessCoach/AssistantShared.js";
import { WellnessCoachPageLoadingState } from "../wellnessCoach/WellnessCoachPageLoader.jsx";

function DetailRow({ label, value }) {
  return <div className="user-detail-row"><span className="user-detail-row__label">{label}</span><span className="user-detail-row__value">{value || "—"}</span></div>;
}

export function MyAssistantsView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((state) => state.auth.adminToken);
  const admin = useSelector(selectAdmin);
  const isCoach = useSelector(selectIsCoachAccount);
  const { canEdit, canDelete } = useResourcePermissions("my-assistants");
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

  const handleDelete = async () => {
    const { isConfirmed } = await Swal.fire({ title: "Delete assistant?", text: assistant.name || assistant.email, icon: "warning", showCancelButton: true, confirmButtonText: "Delete", confirmButtonColor: "#dc2626" });
    if (!isConfirmed) return;
    try {
      await adminDeleteCoachAssistant(adminToken, coachId, id);
      await Swal.fire({ icon: "success", title: "Assistant deleted", timer: 1500 });
      navigate("/admin/my-assistants");
    } catch (err) {
      if (err?.status === 401) dispatch(logout());
      else await Swal.fire({ icon: "error", title: "Delete failed", text: err.message });
    }
  };

  if (!isCoach || notFound) return <NotFoundPage />;
  if (error) return <p className="user-list-error">{error}</p>;
  if (!assistant) return <WellnessCoachPageLoadingState label="Loading assistant…" />;

  return (
    <div className="user-page">
      <AdminPageHeader
        title={assistant.name}
        onBack={() => navigate("/admin/my-assistants")}
        actions={<>{<AdminStatusBadge status={assistant.status} />}{canEdit ? <Link to="edit" className="btn btn--primary">Edit</Link> : null}{canDelete ? <button type="button" className="btn btn--danger" onClick={handleDelete}>Delete</button> : null}</>}
      />
      <div className="page-card user-view-card">
        <div className="user-view-head">
          <div className="user-view-avatar-wrap"><AdminMediaImage path={assistant.profileImage} round width={96} height={96} alt={assistant.name} /></div>
          <div className="user-view-grid">
            <DetailRow label="Email" value={assistant.email} />
            <DetailRow label="Mobile" value={formatPhone(assistant)} />
            <DetailRow label="Designation" value={assistant.designation} />
            <DetailRow label="Created" value={formatDate(assistant.createdAt)} />
            <DetailRow label="Updated" value={formatDate(assistant.updatedAt)} />
          </div>
        </div>
      </div>
    </div>
  );
}
