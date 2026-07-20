import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdminPageLoadingState } from "../../admin/components/AdminLoader.jsx";
import { AdminMediaImage } from "../../admin/components/AdminMediaImage.jsx";
import { AdminPageHeader, AdminStatusBadge } from "../../admin/components/AdminCrud.jsx";
import { NotFoundPage } from "../../admin/pages/NotFoundPage.jsx";
import { formatDateTime } from "../../admin/pages/clientTestimonial/ClientTestimonialShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function PortalClientTestimonialView({ token, onUnauthorized, basePath, getTestimonial }) {
  const { testimonialId } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !testimonialId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const data = await getTestimonial(token, testimonialId);
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
          return;
        }
        setRow(data);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) {
          onUnauthorized?.();
          return;
        }
        if (e?.status === 404) {
          setNotFound(true);
          return;
        }
        setError(e.message || "Failed to load testimonial.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, onUnauthorized, getTestimonial, testimonialId]);

  if (notFound) return <NotFoundPage />;

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate(basePath)}>
          Back to list
        </button>
      </div>
    );
  }

  if (!row) return <AdminPageLoadingState label="Loading testimonial…" />;

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Client testimonial details"
        subtitle="User-submitted review. Toggle public status from the list or edit page."
        onBack={() => navigate(-1)}
        actions={
          <Link to="edit" className="btn btn--primary user-page__edit-link">
            Edit review
          </Link>
        }
      />

      <div className="page-card user-view-card">
        <div style={{ marginBottom: 16 }}>
          <AdminMediaImage path={row.profileImage} round width={96} height={96} alt={row.name || ""} />
        </div>
        <div className="user-view-grid">
          <DetailRow label="Name" value={row.name} />
          <DetailRow label="Rating" value={row.rating} />
          <DetailRow label="User ID" value={row.userId || "—"} />
          <div className="user-detail-row">
            <span className="user-detail-row__label">Public status</span>
            <span className="user-detail-row__value">
              <AdminStatusBadge status={row.status} />
            </span>
          </div>
          <DetailRow label="Created" value={formatDateTime(row.createdAt)} />
          <DetailRow label="Updated" value={formatDateTime(row.updatedAt)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Description</strong>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{row.description || "—"}</div>
        </div>
      </div>
    </div>
  );
}
