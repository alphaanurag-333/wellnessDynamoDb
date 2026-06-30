import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetMentalWellbeingById } from "../../api/adminMentalWellbeing.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader, AdminStatusBadge } from "../../components/AdminCrud.jsx";
import { formatDate, typeLabel } from "./MentalWellbeingShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function MentalWellbeingView() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [item, setItem] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !itemId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetMentalWellbeingById(adminToken, itemId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setItem(row);
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
        setError(e.message || "Failed to load item.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, itemId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/mental-wellbeing")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!item) {
    return <AdminPageLoadingState label="Loading item…" />;
  }

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Mental wellbeing details"
        subtitle="View this entry."
        onBack={() => navigate(-1)}
        actions={
          <Link to="edit" className="btn btn--primary user-page__edit-link">
            Edit item
          </Link>
        }
      />

      <div className="page-card user-view-card">
        <div className="user-view-grid">
          <DetailRow label="Title" value={item.title} />
          <DetailRow label="Type" value={typeLabel(item.type)} />
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
          <strong>{typeLabel(item.type)}</strong>
          {item.type === "ytlink" ? (
            item.ytLink ? (
              <div style={{ marginTop: 8 }}>
                <a href={item.ytLink} target="_blank" rel="noreferrer">
                  {item.ytLink}
                </a>
              </div>
            ) : (
              <div style={{ marginTop: 6 }}>—</div>
            )
          ) : item.type === "video" ? (
            item.file ? (
              <div style={{ marginTop: 8 }}>
                <video
                  src={item.file}
                  controls
                  playsInline
                  preload="metadata"
                  style={{ width: "100%", maxWidth: 560, maxHeight: 320, borderRadius: 8, display: "block" }}
                />
              </div>
            ) : (
              <div style={{ marginTop: 6 }}>—</div>
            )
          ) : item.type === "audio" ? (
            item.file ? (
              <div style={{ marginTop: 8 }}>
                <audio src={item.file} controls preload="metadata" style={{ width: "100%", maxWidth: 480, display: "block" }} />
              </div>
            ) : (
              <div style={{ marginTop: 6 }}>—</div>
            )
          ) : (
            <div style={{ marginTop: 6 }}>—</div>
          )}
        </div>
      </div>
    </div>
  );
}
