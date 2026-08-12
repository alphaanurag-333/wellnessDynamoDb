import { useOutletContext } from "react-router-dom";
import { PageHeader } from "../components/shared.jsx";

export function PendingPage() {
  const { showToast } = useOutletContext();
  return (
    <main className="content ua-page-enter">
      <PageHeader
        title="Pending Tasks"
        subtitle="Counselling, blood reports, nutrition orders, and meal reviews awaiting action."
        autosave
        onAutosave={() => showToast("Saved")}
      />
      <div className="ua-placeholder-card">
        <p>Pending task queues for coach roles will appear here.</p>
      </div>
    </main>
  );
}
