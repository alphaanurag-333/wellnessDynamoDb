import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { WellnessCoachForm } from "./WellnessCoachForm.jsx";

export function WellnessCoachAdd() {
  const navigate = useNavigate();

  return (
    <div className="user-page">
      <div className="user-page__toolbar">
        <button type="button" className="user-back-btn" aria-label="Back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
        <div>
          <h2 className="user-page__title">Add wellness coach</h2>
        </div>
      </div>
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
