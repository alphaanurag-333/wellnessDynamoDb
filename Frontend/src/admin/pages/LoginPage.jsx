import { Navigate } from "react-router-dom";

/**
 * Every account type now signs in through one unified `/panel/login`
 * (see `Frontend/src/panel/pages/PanelLoginPage.jsx`), which mirrors an
 * Admin session into this portal's own `adminToken`/`admin` slot so
 * `/admin/*` keeps working exactly as before — only the login form itself
 * moved.
 */
export function AdminLoginPage() {
  return <Navigate to="/panel/login" replace />;
}
