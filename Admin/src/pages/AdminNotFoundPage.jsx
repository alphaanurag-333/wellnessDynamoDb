import { Link, useOutletContext } from "react-router-dom";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";

export function AdminNotFoundPage() {
  const { showToast } = useOutletContext();

  return (
    <main className="content">
      <div className="ua-not-found">
        <div className="ua-not-found__code">404</div>
        <h1 className="ua-not-found__title">Page not found</h1>
        <p className="ua-not-found__sub">
          That admin view does not exist. Use the sidebar or return to the dashboard.
        </p>
        <div className="ua-not-found__actions">
          <Link to={UPDATED_ADMIN_PATHS.dashboard} className="ua-btn-orange ua-not-found__btn">
            Back to Dashboard
          </Link>
          <button type="button" className="btn btn--outline" onClick={() => showToast("Contact support if you need this page")}>
            Report missing page
          </button>
        </div>
      </div>
    </main>
  );
}
