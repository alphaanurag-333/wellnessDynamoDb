import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetBannerById } from "../../api/bannerController.js";
import { logout } from "../../../store/authSlice.js";
import { AdminDetailBannerImage } from "../../components/AdminDetailBannerImage.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
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
      <div className="user-page__toolbar">
        <button type="button" className="user-back-btn" aria-label="Back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
        <div className="user-page__toolbar-text">
          <h2 className="user-page__title">Banner details</h2>
        </div>
        <Link to="edit" className="btn btn--primary user-page__edit-link">
          Edit banner
        </Link>
      </div>

      <div className="page-card user-view-card">
        <AdminDetailBannerImage path={banner.image} alt={banner.title || "Banner"} />
        <div className="user-view-grid">
          <DetailRow label="Title" value={banner.title} />
          <div className="user-detail-row user-detail-row--stack">
            <span className="user-detail-row__label">Description</span>
            <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{banner.description || "—"}</div>
          </div>
          <DetailRow label="Status" value={banner.status} />
          <DetailRow label="Created" value={formatDate(banner.createdAt)} />
          <DetailRow label="Updated" value={formatDate(banner.updatedAt)} />
        </div>
      </div>
    </div>
  );
}
