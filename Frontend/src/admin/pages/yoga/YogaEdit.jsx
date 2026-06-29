import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetYogaById } from "../../api/adminYoga.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { YogaForm } from "./YogaAdd.jsx";

export function YogaEdit() {
  const { yogaId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [yoga, setYoga] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !yogaId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetYogaById(adminToken, yogaId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setYoga(row);
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
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load yoga." });
        navigate("/admin/yoga");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, yogaId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader title="Edit yoga" subtitle="Update this yoga entry." backTo="/admin/yoga" />
      <div className="page-card">
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading yoga..." />
          </div>
        ) : yoga ? (
          <YogaForm mode="edit" initialYoga={yoga} key={yoga._id || yogaId} />
        ) : null}
      </div>
    </div>
  );
}
