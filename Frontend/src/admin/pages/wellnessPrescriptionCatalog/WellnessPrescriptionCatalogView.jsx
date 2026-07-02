import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { adminGetWellnessPrescriptionCatalogById } from "../../api/adminWellnessPrescriptionCatalog.js";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { formatDate } from "./WellnessPrescriptionCatalogShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function WellnessPrescriptionCatalogView() {
  const { prescriptionId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [prescription, setPrescription] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !prescriptionId) return;
    let cancelled = false;
    setError("");
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
        setError(e.message || "Failed to load prescription.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, prescriptionId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/wellness-prescriptions")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!prescription) {
    return <AdminPageLoadingState label="Loading prescription…" />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Wellness prescription details"
        subtitle={prescription.title}
        onBack={() => navigate(-1)}
        actions={
          <Link to="edit" className="btn btn--primary user-page__edit-link">
            Edit prescription
          </Link>
        }
      />
      <div className="page-card user-view-card">
        <div className="user-view-grid">
          <DetailRow label="Title" value={prescription.title} />
          <DetailRow label="Prescription ID" value={prescription.prescriptionId} />
          <DetailRow label="Category" value={prescription.category} />
          <DetailRow label="Sequence" value={prescription.sequence ?? 0} />
          <div className="user-detail-row">
            <span className="user-detail-row__label">Status</span>
            <span className="user-detail-row__value">
              <AdminStatusBadge status={prescription.status} />
            </span>
          </div>
          <DetailRow label="Created" value={formatDate(prescription.createdAt)} />
          <DetailRow label="Updated" value={formatDate(prescription.updatedAt)} />
        </div>

        <h3 className="form-card__title" style={{ marginTop: 24 }}>
          Points ({Array.isArray(prescription.points) ? prescription.points.length : 0})
        </h3>
        <ul style={{ marginTop: 12, paddingLeft: 20 }}>
          {(prescription.points || []).length === 0 ? (
            <li className="data-table__muted">No points.</li>
          ) : (
            (prescription.points || []).map((point, idx) => (
              <li key={idx} style={{ marginBottom: 8 }}>
                {point}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
