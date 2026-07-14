import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetSubAdminById } from "../../api/subAdminApi.js";
import { logout } from "../../../store/authSlice.js";
import { selectIsSuperAdmin } from "../../../store/authSelectors.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { SubAdminForm } from "./SubAdminAdd.jsx";
import { getSubAdminId } from "./SubAdminShared.js";

export function SubAdminEdit() {
  const { subAdminId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const [subAdmin, setSubAdmin] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !subAdminId || !isSuperAdmin) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetSubAdminById(adminToken, subAdminId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setSubAdmin(row);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) {
          dispatch(logout());
          return;
        }
        if (e?.status === 404) {
          setNotFound(true);
          return;
        }
        if (e?.status === 403) {
          setNotFound(true);
          return;
        }
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load sub-admin." });
        navigate("/admin/sub-admins");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, subAdminId, isSuperAdmin]);

  if (!isSuperAdmin || notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader title="Edit sub-admin" subtitle="Update this sub-admin's details." backTo="/admin/sub-admins" />
      <div className="page-card">
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading sub-admin..." />
          </div>
        ) : subAdmin ? (
          <SubAdminForm mode="edit" initialSubAdmin={subAdmin} key={getSubAdminId(subAdmin) || subAdminId} />
        ) : null}
      </div>
    </div>
  );
}
