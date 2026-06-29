import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetVideoTestimonialById } from "../../api/videoTestimonialsController.js";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { mediaUrl } from "../../../media.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { formatDateTime } from "./VideoTestimonialShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function VideoTestimonialView() {
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
        const data = await adminGetVideoTestimonialById(adminToken, testimonialId);
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
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/video-testimonials")}>
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
      <AdminPageHeader
        title="Video testimonial details"
        subtitle="View this video testimonial."
        onBack={() => navigate(-1)}
        actions={
          <Link to="edit" className="btn btn--primary user-page__edit-link">
            Edit testimonial
          </Link>
        }
      />

      <div className="page-card user-view-card">
        <div style={{ marginBottom: 16 }}>
          <AdminMediaImage path={row.profileImage} round width={96} height={96} alt={row.name || ""} />
        </div>
        <div className="user-view-grid">
          <DetailRow label="Name" value={row.name} />
          <DetailRow label="Type" value={row.type} />
          <div className="user-detail-row">
            <span className="user-detail-row__label">Status</span>
            <span className="user-detail-row__value">
              <AdminStatusBadge status={row.status} />
            </span>
          </div>
          <DetailRow label="Created" value={formatDateTime(row.createdAt)} />
          <DetailRow label="Updated" value={formatDateTime(row.updatedAt)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>{row.type === "video" ? "Video" : "YouTube link"}</strong>
          {row.type === "link" ? (
            row.ytLink ? (
              <div style={{ marginTop: 8 }}>
                <a href={row.ytLink} target="_blank" rel="noreferrer">
                  {row.ytLink}
                </a>
              </div>
            ) : (
              <div style={{ marginTop: 6 }}>—</div>
            )
          ) : row.video ? (
            <div style={{ marginTop: 8 }}>
              <video
                src={mediaUrl(row.video)}
                controls
                style={{ width: "100%", maxWidth: 560, maxHeight: 320, borderRadius: 8, display: "block" }}
              />
            </div>
          ) : (
            <div style={{ marginTop: 6 }}>—</div>
          )}
        </div>
      </div>
    </div>
  );
}
