import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MyAssistantForm } from "./MyAssistantForm.jsx";

export function MyAssistantAdd() {
  const navigate = useNavigate();

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
        <div>
          <h2 className="user-page__title">Add assistant</h2>
        </div>
      </div>
      <div className="user-page__card">
        <MyAssistantForm
          mode="create"
          submitLabel="Create assistant"
          onCancel={() => navigate("/coach/my-assistants")}
          onSuccess={async () => {
            await Swal.fire({ icon: "success", title: "Assistant created", timer: 1500 });
            navigate("/coach/my-assistants");
          }}
        />
      </div>
    </div>
  );
}
