import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetSpecializationById } from "../../api/adminSpecializations.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { SpecializationForm } from "./SpecializationAdd.jsx";
import { getSpecializationId } from "./SpecializationShared.js";

export function SpecializationEdit() {
  const { specializationId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [specialization, setSpecialization] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !specializationId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetSpecializationById(adminToken, specializationId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setSpecialization(row);
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
        await Swal.fire({
          icon: "error",
          title: "Load failed",
          text: e.message || "Failed to load specialization.",
        });
        navigate("/admin/specializations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, specializationId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader title="Edit specialization" subtitle="Update this specialization's details." backTo="/admin/specializations" />
      <div className="page-card">
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading specialization..." />
          </div>
        ) : specialization ? (
          <SpecializationForm
            mode="edit"
            initialSpecialization={specialization}
            key={getSpecializationId(specialization) || specializationId}
          />
        ) : null}
      </div>
    </div>
  );
}
