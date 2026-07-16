import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetRoleById } from "../../api/roleApi.js";
import { logout } from "../../../store/authSlice.js";
import { selectIsSuperAdmin } from "../../../store/authSelectors.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { RoleForm } from "./RoleAdd.jsx";
import { getRoleId, getRoleScope } from "./RoleShared.js";

export function RoleEdit() {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const [role, setRole] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !roleId || !isSuperAdmin) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetRoleById(adminToken, roleId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setRole(row);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) {
          dispatch(logout());
          return;
        }
        if (e?.status === 404 || e?.status === 403) {
          setNotFound(true);
          return;
        }
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load role." });
        navigate("/admin/roles");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, roleId, isSuperAdmin]);

  if (!isSuperAdmin || notFound) {
    return <NotFoundPage />;
  }

  const roleScope = role ? getRoleScope(role) : "ADMIN";

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Edit role"
        subtitle="Update this role's name, status, and permissions."
        backTo={`/admin/roles?scope=${encodeURIComponent(roleScope)}`}
      />
      <div className="page-card">
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading role..." />
          </div>
        ) : role ? (
          <RoleForm mode="edit" initialRole={role} key={getRoleId(role) || roleId} />
        ) : null}
      </div>
    </div>
  );
}
