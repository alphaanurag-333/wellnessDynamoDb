import { Link } from "react-router-dom";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";

export function AdminNotFoundPage() {
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
        </div>
      </div>
    </main>
  );
}
