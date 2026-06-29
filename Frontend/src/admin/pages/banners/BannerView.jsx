import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetBannerById } from "../../api/bannerController.js";
import { logout } from "../../../store/authSlice.js";
import { AdminDetailBannerImage } from "../../components/AdminDetailBannerImage.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { formatDate } from "./BannerShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function BannerView() {
  const { bannerId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [banner, setBanner] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !bannerId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetBannerById(adminToken, bannerId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setBanner(row);
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
        setError(e.message || "Failed to load banner.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, bannerId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/banners")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!banner) {
    return <AdminPageLoadingState label="Loading banner…" />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Banner details"
        subtitle="View this banner."
        onBack={() => navigate(-1)}
        actions={
          <Link to="edit" className="btn btn--primary user-page__edit-link">
            Edit banner
          </Link>
        }
      />

      <div className="page-card user-view-card">
        <AdminDetailBannerImage path={banner.image} alt={banner.title || "Banner"} />
        <div className="user-view-grid">
          <DetailRow label="Title" value={banner.title} />
          <div className="user-detail-row user-detail-row--stack">
            <span className="user-detail-row__label">Description</span>
            <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{banner.description || "—"}</div>
          </div>
          <div className="user-detail-row">
            <span className="user-detail-row__label">Status</span>
            <span className="user-detail-row__value">
              <AdminStatusBadge status={banner.status} />
            </span>
          </div>
          <DetailRow label="Created" value={formatDate(banner.createdAt)} />
          <DetailRow label="Updated" value={formatDate(banner.updatedAt)} />
        </div>
      </div>
    </div>
  );
}
