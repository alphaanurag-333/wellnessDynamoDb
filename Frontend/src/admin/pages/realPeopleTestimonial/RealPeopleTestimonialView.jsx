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
  approvalBadgeClass,
  approvalLabel,
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

  useEffect(() => {
    if (!adminToken || !testimonialId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await adminGetRealPeopleTestimonialById(adminToken, testimonialId);
        if (cancelled) return;
        if (!data) setNotFound(true);
        else setRow(data);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) dispatch(logout());
        else if (e?.status === 404) setNotFound(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, testimonialId]);

  if (notFound) return <NotFoundPage />;
  if (!row) return <AdminPageLoadingState label="Loading testimonial…" />;

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Real people testimonial"
        onBack={() => navigate(-1)}
        actions={
          <Link to="edit" className="btn btn--primary user-page__edit-link">
            Edit
          </Link>
        }
      />
      <div className="page-card user-view-card">
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
          <AdminMediaImage path={testimonialAvatarPath(row)} round width={72} height={72} alt={row.userName || "Profile"} />
          <div>
            <strong>{row.userName || "—"}</strong>
            <div className="data-table__muted">Member since {row.memberSinceYear ?? "—"}</div>
            <div className="data-table__muted">{starsValue(row)} / 5 stars</div>
          </div>
        </div>
        <div className="user-view-grid">
          <DetailRow label="User ID" value={row.userId} />
          <DetailRow label="Health concern" value={healthConcernLabel(row)} />
          <div className="user-detail-row">
            <span className="user-detail-row__label">Status</span>
            <span className="user-detail-row__value"><AdminStatusBadge status={row.status} /></span>
          </div>
          <div className="user-detail-row">
            <span className="user-detail-row__label">Approval</span>
            <span className="user-detail-row__value">
              <span className={approvalBadgeClass(row.approvalStatus)}>{approvalLabel(row.approvalStatus)}</span>
            </span>
          </div>
          <DetailRow label="Submitted by" value={row.submittedByRole || "—"} />
          <DetailRow label="Created" value={formatDateTime(row.createdAt)} />
          <DetailRow label="Updated" value={formatDateTime(row.updatedAt)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Review</strong>
          <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{reviewText(row)}</p>
        </div>
        {row.rejectionReason ? (
          <p className="data-table__muted" style={{ marginTop: 12 }}>Rejection reason: {row.rejectionReason}</p>
        ) : null}
      </div>
    </div>
  );
}
