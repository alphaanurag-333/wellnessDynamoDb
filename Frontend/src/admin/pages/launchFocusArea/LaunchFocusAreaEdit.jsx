import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetLaunchFocusAreaById } from "../../api/adminLaunchFocusAreas.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { LaunchFocusAreaForm } from "./LaunchFocusAreaAdd.jsx";

export function LaunchFocusAreaEdit() {
  const { focusAreaId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [item, setItem] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !focusAreaId) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await adminGetLaunchFocusAreaById(adminToken, focusAreaId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setItem(row);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) return dispatch(logout());
        if (e?.status === 404) return setNotFound(true);
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load." });
        navigate("/admin/launch-focus-areas");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, focusAreaId, navigate]);

  if (notFound) return <NotFoundPage />;

  return (
    <div className="user-page">
      <AdminPageHeader title="Edit area to focus" subtitle="Update this focus area item." backTo="/admin/launch-focus-areas" />
      <div className="page-card">
        {loading ? (
          <AdminPageLoader label="Loading…" />
        ) : item ? (
          <LaunchFocusAreaForm mode="edit" initialItem={item} key={item._id || focusAreaId} />
        ) : null}
      </div>
    </div>
  );
}
