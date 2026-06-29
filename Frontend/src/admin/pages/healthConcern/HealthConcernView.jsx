import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetHealthConcernById } from "../../api/adminHealthConcerns.js";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { formatDate } from "./HealthConcernShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function HealthConcernView() {
  const { concernId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [concern, setConcern] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !concernId) return;
    let cancelled = false;
    setError("");
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
        setError(e.message || "Failed to load health concern.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, concernId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/health-concerns")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!concern) {
    return <AdminPageLoadingState label="Loading health concern…" />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Health concern details"
        subtitle="View this health concern's details."
        onBack={() => navigate(-1)}
        actions={
          <Link to="edit" className="btn btn--primary user-page__edit-link">
            Edit concern
          </Link>
        }
      />

      <div className="page-card user-view-card">
        <div style={{ marginBottom: 16 }}>
          <AdminMediaImage path={concern.icon} width={96} height={96} radius={8} alt={concern.title || ""} />
        </div>
        <div className="user-view-grid">
          <DetailRow label="Title" value={concern.title} />
          <div className="user-detail-row">
            <span className="user-detail-row__label">Status</span>
            <span className="user-detail-row__value">
              <AdminStatusBadge status={concern.status} />
            </span>
          </div>
          <DetailRow label="Created" value={formatDate(concern.createdAt)} />
          <DetailRow label="Updated" value={formatDate(concern.updatedAt)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Description</strong>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{concern.description || "—"}</div>
        </div>
      </div>
    </div>
  );
}
