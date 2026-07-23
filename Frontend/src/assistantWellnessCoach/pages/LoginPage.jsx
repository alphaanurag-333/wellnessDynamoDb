import { Navigate } from "react-router-dom";

/**
 * Every account type now signs in through one unified `/panel/login`
 * (see `Frontend/src/panel/pages/PanelLoginPage.jsx`), which mirrors an
 * Assistant session into this portal's own `assistantToken`/`assistant`
 * slot so `/assistant/*` keeps working exactly as before — only the login
 * form itself moved.
 */
export function AssistantLoginPage() {
  return <Navigate to="/panel/login" replace />;
}
