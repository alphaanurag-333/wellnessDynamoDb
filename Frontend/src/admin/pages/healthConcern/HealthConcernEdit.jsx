import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetHealthConcernById } from "../../api/adminHealthConcerns.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { HealthConcernForm } from "./HealthConcernAdd.jsx";

export function HealthConcernEdit() {
  const { concernId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [concern, setConcern] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !concernId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetHealthConcernById(adminToken, concernId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setConcern(row);
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
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load health concern." });
        navigate("/admin/health-concerns");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, concernId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader title="Edit health concern" subtitle="Update this health concern's details." backTo="/admin/health-concerns" />
      <div className="page-card">
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading health concern..." />
          </div>
        ) : concern ? (
          <HealthConcernForm mode="edit" initialConcern={concern} key={concern._id || concernId} />
        ) : null}
      </div>
    </div>
  );
}
