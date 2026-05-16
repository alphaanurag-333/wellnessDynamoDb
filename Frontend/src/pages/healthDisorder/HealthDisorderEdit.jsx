import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetHealthDisorderById } from "../../api/adminHealthDisorders.js";
import { logout } from "../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { HealthDisorderForm } from "./HealthDisorderAdd.jsx";

export function HealthDisorderEdit() {
  const { disorderId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [disorder, setDisorder] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !disorderId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetHealthDisorderById(adminToken, disorderId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setDisorder(row);
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
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load health disorder." });
        navigate("/admin/health-disorders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, disorderId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Edit health disorder</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/health-disorders")}>
            Back to list
          </button>
        </div>
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading health disorder..." />
          </div>
        ) : disorder ? (
          <HealthDisorderForm mode="edit" initialDisorder={disorder} key={disorder._id || disorderId} />
        ) : null}
      </div>
    </div>
  );
}
