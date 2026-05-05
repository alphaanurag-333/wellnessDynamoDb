import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export function RootRedirect() {
  const adminToken = useSelector((s) => s.auth.adminToken);
  return <Navigate to={adminToken ? "/admin/dashboard" : "/login"} replace />;
}
