import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetYogaById } from "../../api/adminYoga.js";
import { logout } from "../../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { mediaUrl } from "../../../media.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { formatDate } from "./YogaShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function YogaView() {
  const { yogaId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [yoga, setYoga] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !yogaId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetYogaById(adminToken, yogaId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setYoga(row);
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
        setError(e.message || "Failed to load yoga.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, yogaId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/yoga")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!yoga) {
    return <AdminPageLoadingState label="Loading yoga…" />;
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
          <h2 className="user-page__title">Yoga details</h2>
        </div>
        <Link to="edit" className="btn btn--accent user-page__edit-link">
          Edit yoga
        </Link>
      </div>

      <div className="page-card user-view-card">
        <div style={{ marginBottom: 16 }}>
          <AdminMediaImage path={yoga.thumbnail} width={96} height={96} radius={8} alt={yoga.title || ""} />
        </div>
        <div className="user-view-grid">
          <DetailRow label="Title" value={yoga.title} />
          <DetailRow label="Type" value={yoga.type === "video" ? "Video" : yoga.type === "ytlink" ? "YT Link" : yoga.type} />
          <DetailRow label="Status" value={yoga.status} />
          <DetailRow label="Created" value={formatDate(yoga.createdAt)} />
          <DetailRow label="Updated" value={formatDate(yoga.updatedAt)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>{yoga.type === "video" ? "Video" : "YT Link"}</strong>
          {yoga.type === "ytlink" ? (
            yoga.ytLink ? (
              <div style={{ marginTop: 8 }}>
                <a href={yoga.ytLink} target="_blank" rel="noreferrer">
                  {yoga.ytLink}
                </a>
              </div>
            ) : (
              <div style={{ marginTop: 6 }}>—</div>
            )
          ) : yoga.type === "video" ? (
            yoga.video ? (
              <div style={{ marginTop: 8 }}>
                <video
                  src={mediaUrl(yoga.video)}
                  controls
                  playsInline
                  preload="metadata"
                  style={{ width: "100%", maxWidth: 560, maxHeight: 320, borderRadius: 8, display: "block" }}
                />
              </div>
            ) : (
              <div style={{ marginTop: 6 }}>—</div>
            )
          ) : (
            <div style={{ marginTop: 6 }}>—</div>
          )}
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Description</strong>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{yoga.description || "—"}</div>
        </div>
      </div>
    </div>
  );
}
