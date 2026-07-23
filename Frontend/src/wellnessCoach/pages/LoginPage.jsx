import { Navigate } from "react-router-dom";

/**
 * Every account type now signs in through one unified `/panel/login`
 * (see `Frontend/src/panel/pages/PanelLoginPage.jsx`), which mirrors a
 * Coach session into this portal's own `coachToken`/`coach` slot so
 * `/coach/*` keeps working exactly as before — only the login form itself
 * moved. `/coach/register` (self-service sign-up) is unaffected.
 */
export function CoachLoginPage() {
  return <Navigate to="/panel/login" replace />;
}
