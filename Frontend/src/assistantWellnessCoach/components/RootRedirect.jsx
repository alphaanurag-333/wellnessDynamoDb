import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export function AssistantRootRedirect() {
  const assistantToken = useSelector((s) => s.auth.assistantToken);
  return <Navigate to={assistantToken ? "/assistant/dashboard" : "/assistant/login"} replace />;
}
