import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetSupplementById } from "../../api/adminSupplements.js";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { formatDate, formatPrice } from "./SupplementShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function SupplementView() {
  const { supplementId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [supplement, setSupplement] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !supplementId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetSupplementById(adminToken, supplementId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setSupplement(row);
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
        setError(e.message || "Failed to load supplement.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, supplementId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/supplements")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!supplement) {
    return <AdminPageLoadingState label="Loading supplement…" />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Supplement details"
        subtitle="View this supplement entry."
        onBack={() => navigate(-1)}
        actions={
          <Link to="edit" className="btn btn--primary user-page__edit-link">
            Edit supplement
          </Link>
        }
      />

      <div className="page-card user-view-card">
        <div style={{ marginBottom: 16 }}>
          <AdminMediaImage path={supplement.image} width={120} height={120} radius={8} alt={supplement.name || ""} />
        </div>
        <div className="user-view-grid">
          <DetailRow label="Name" value={supplement.name} />
          <DetailRow label="Pack size" value={`${supplement.packSize ?? "—"} ${supplement.unit || ""}`.trim()} />
          <DetailRow label="Price" value={formatPrice(supplement.price)} />
          <div className="user-detail-row">
            <span className="user-detail-row__label">Status</span>
            <span className="user-detail-row__value">
              <AdminStatusBadge status={supplement.status} />
            </span>
          </div>
          <DetailRow label="Created" value={formatDate(supplement.createdAt)} />
          <DetailRow label="Updated" value={formatDate(supplement.updatedAt)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Description</strong>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{supplement.description || "—"}</div>
        </div>
      </div>
    </div>
  );
}
