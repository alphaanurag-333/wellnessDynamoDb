import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetClientTestimonialById } from "../../api/clientTestimonialsController.js";
import { logout } from "../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { formatDateTime } from "./ClientTestimonialShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function ClientTestimonialView() {
  const { testimonialId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [row, setRow] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !testimonialId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const data = await adminGetClientTestimonialById(adminToken, testimonialId);
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
          return;
        }
        setRow(data);
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
        setError(e.message || "Failed to load testimonial.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, testimonialId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/client-testimonials")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!row) {
    return <AdminPageLoadingState label="Loading testimonial…" />;
  }

  return (
    <div className="user-page">
      <div className="user-page__toolbar">
        <button type="button" className="user-back-btn" aria-label="Back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">Client testimonial details</h2>
        </div>
        <Link to="edit" className="btn btn--accent user-page__edit-link">
          Edit testimonial
        </Link>
      </div>

      <div className="page-card user-view-card">
        <div style={{ marginBottom: 16 }}>
          <AdminMediaImage path={row.profile_image} round width={96} height={96} alt={row.name || ""} />
        </div>
        <div className="user-view-grid">
          <DetailRow label="Name" value={row.name} />
          <DetailRow label="Rating" value={row.rating} />
          <DetailRow label="Status" value={row.status} />
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
