import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetHealthToolById } from "../../api/adminHealthTools.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { HealthToolForm } from "./HealthToolAdd.jsx";

export function HealthToolEdit() {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [tool, setTool] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !toolId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetHealthToolById(adminToken, toolId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setTool(row);
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
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load health tool." });
        navigate("/admin/health-tools");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, toolId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader title="Edit health tool" subtitle="Update this health tool's details." backTo="/admin/health-tools" />
      <div className="page-card">
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading health tool..." />
          </div>
        ) : tool ? (
          <HealthToolForm mode="edit" initialTool={tool} key={tool._id || toolId} />
        ) : null}
      </div>
    </div>
  );
}
