import { useOutletContext } from "react-router-dom";
import { PageHeader } from "../components/shared.jsx";

export function SopPage() {
  const { showToast } = useOutletContext();
  return (
    <main className="content ua-page-enter">
      <PageHeader
        title="SOP"
        subtitle="Standard operating procedures for coaches and support staff."
        autosave
        onAutosave={() => showToast("Saved")}
      />
      <div className="ua-placeholder-card">
        <p>SOP library and document uploads will appear here.</p>
      </div>
    </main>
  );
}
