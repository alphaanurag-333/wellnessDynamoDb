import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { WellnessCoachForm } from "./WellnessCoachForm.jsx";

export function WellnessCoachAdd() {
  const navigate = useNavigate();

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Add wellness coach"
        subtitle="Create a new wellness coach profile."
        onBack={() => navigate(-1)}
      />
      <div className="user-page__card">
        <WellnessCoachForm
          mode="create"
          submitLabel="Create coach"
          onCancel={() => navigate("/admin/coaches")}
          onSuccess={async () => {
            await Swal.fire({ icon: "success", title: "Coach created", timer: 1500 });
            navigate("/admin/coaches");
          }}
        />
      </div>
    </div>
  );
}
