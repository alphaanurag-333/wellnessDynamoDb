import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export function CoachRootRedirect() {
  const coachToken = useSelector((s) => s.auth.coachToken);
  return <Navigate to={coachToken ? "/coach/dashboard" : "/coach/login"} replace />;
}
