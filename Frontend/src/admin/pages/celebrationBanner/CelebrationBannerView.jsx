import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetCelebrationBannerById } from "../../api/celebrationController.js";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { formatDateTime, typeLabel } from "./CelebrationBannerShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function CelebrationBannerView() {
  const { celebrationId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [banner, setBanner] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !celebrationId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetCelebrationBannerById(adminToken, celebrationId);
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
        setError(e.message || "Failed to load celebration banner.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, celebrationId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/celebration-banners")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!banner) {
    return <AdminPageLoadingState label="Loading celebration banner…" />;
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
          <h2 className="user-page__title">Celebration banner details</h2>
        </div>
        <Link to="edit" className="btn btn--accent user-page__edit-link">
          Edit banner
        </Link>
      </div>

      <div className="page-card user-view-card">
        <div style={{ marginBottom: 16 }}>
          <AdminMediaImage path={banner.image} width={320} height={200} radius={8} alt={banner.title || ""} style={{ width: "100%", maxHeight: 250 }} />
        </div>
        <div className="user-view-grid">
          <DetailRow label="Title" value={banner.title} />
          <DetailRow label="Type" value={typeLabel(banner.type)} />
          <DetailRow label="Status" value={banner.status} />
          <DetailRow label="Start" value={banner.startDate || "—"} />
          <DetailRow label="End" value={banner.endDate || "—"} />
          <DetailRow label="Created" value={formatDateTime(banner.createdAt)} />
          <DetailRow label="Updated" value={formatDateTime(banner.updatedAt)} />
        </div>
      </div>
    </div>
  );
}
