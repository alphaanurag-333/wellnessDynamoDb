import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { firstAllowedAdminPath } from "../utils/navAccess.js";

export function RootRedirect() {
  const adminToken = useSelector((s) => s.auth.adminToken);
  const admin = useSelector((s) => s.auth.admin);
  if (!adminToken) return <Navigate to="/admin/login" replace />;
  return (
    <Navigate
      to={firstAllowedAdminPath({
        isSuperAdmin: Boolean(admin?.isSuperAdmin),
        permissions: Array.isArray(admin?.permissions) ? admin.permissions : [],
      })}
      replace
    />
  );
}
