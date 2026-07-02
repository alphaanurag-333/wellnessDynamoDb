import { useEffect, useState } from "react";
import { AdminPageLoader } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { adminGetWellnessPrescriptionCatalogById } from "../../api/adminWellnessPrescriptionCatalog.js";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { WellnessPrescriptionCatalogForm } from "./WellnessPrescriptionCatalogAdd.jsx";

export function WellnessPrescriptionCatalogEdit() {
  const { prescriptionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [prescription, setPrescription] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken || !prescriptionId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetWellnessPrescriptionCatalogById(adminToken, prescriptionId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setPrescription(row);
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
        await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load prescription." });
        navigate("/admin/wellness-prescriptions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, navigate, prescriptionId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader title="Edit wellness prescription" subtitle="Update this prescription template." backTo="/admin/wellness-prescriptions" />
      <div className="page-card">
        {loading ? (
          <div className="static-cms-loading">
            <AdminPageLoader label="Loading prescription..." />
          </div>
        ) : prescription ? (
          <WellnessPrescriptionCatalogForm mode="edit" initialPrescription={prescription} key={prescription._id || prescriptionId} />
        ) : null}
      </div>
    </div>
  );
}
