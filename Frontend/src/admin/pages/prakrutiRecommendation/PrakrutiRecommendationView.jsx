import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetPrakrutiRecommendationById } from "../../api/adminPrakrutiRecommendations.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { prakrutiTypeLabel } from "../../../components/prakrutiShared.js";
import { formatDate } from "./PrakrutiRecommendationShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function PrakrutiRecommendationView() {
  const { recommendationId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [item, setItem] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!adminToken || !recommendationId) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await adminGetPrakrutiRecommendationById(adminToken, recommendationId);
        if (cancelled) return;
        if (!row) setNotFound(true);
        else setItem(row);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) dispatch(logout());
        else if (e?.status === 404) setNotFound(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, recommendationId]);

  if (notFound) return <NotFoundPage />;
  if (!item) return <AdminPageLoadingState label="Loading…" />;

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Prakruti recommendation"
        subtitle="View this recommendation item."
        onBack={() => navigate(-1)}
        actions={
          <Link to="edit" className="btn btn--primary user-page__edit-link">
            Edit
          </Link>
        }
      />
      <div className="page-card user-view-card">
        <div className="user-view-grid">
          <DetailRow label="Prakruti type" value={prakrutiTypeLabel(item.prakrutiType)} />
          <DetailRow label="Sort order" value={item.sortOrder ?? 0} />
          <div className="user-detail-row">
            <span className="user-detail-row__label">Status</span>
            <span className="user-detail-row__value">
              <AdminStatusBadge status={item.status} />
            </span>
          </div>
          <DetailRow label="Created" value={formatDate(item.createdAt)} />
          <DetailRow label="Updated" value={formatDate(item.updatedAt)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Title</strong>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{item.title || "—"}</div>
        </div>
      </div>
    </div>
  );
}
