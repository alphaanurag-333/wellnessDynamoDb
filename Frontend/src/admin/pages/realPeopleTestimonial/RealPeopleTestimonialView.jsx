import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetRealPeopleTestimonialById } from "../../api/realPeopleTestimonials.js";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import {
  displayName,
  formatDateTime,
  healthConcernLabel,
  reviewText,
  starsValue,
  testimonialAvatarPath,
} from "./RealPeopleTestimonialShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function RealPeopleTestimonialView() {
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
        const data = await adminGetRealPeopleTestimonialById(adminToken, testimonialId);
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

  if (notFound) return <NotFoundPage />;

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/real-people-testimonials")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!row) return <AdminPageLoadingState label="Loading testimonial…" />;

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Real people testimonial"
        subtitle="View this healing story."
        onBack={() => navigate(-1)}
        actions={
          <Link to="edit" className="btn btn--primary user-page__edit-link">
            Edit
          </Link>
        }
      />
      <div className="page-card user-view-card">
        <div style={{ marginBottom: 16 }}>
          <AdminMediaImage path={testimonialAvatarPath(row)} round width={96} height={96} alt={displayName(row)} />
        </div>
        <div className="user-view-grid">
          <DetailRow label="Name" value={displayName(row)} />
          <DetailRow label="Stars" value={starsValue(row)} />
          <DetailRow label="Health concern" value={healthConcernLabel(row)} />
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
          <strong>Review</strong>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{reviewText(row)}</div>
        </div>
      </div>
    </div>
  );
}
