import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { adminGetNotificationById } from "../../api/notificationController.js";
import { logout } from "../../store/authSlice.js";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { audienceLabel, formatDateTime } from "./NotificationShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function NotificationView() {
  const { notificationId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [notification, setNotification] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminToken || !notificationId) return;
    let cancelled = false;
    setError("");
    setNotFound(false);
    (async () => {
      try {
        const row = await adminGetNotificationById(adminToken, notificationId);
        if (cancelled) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setNotification(row);
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
        setError(e.message || "Failed to load notification.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, notificationId]);

  if (notFound) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <div className="user-page">
        <p className="user-list-error" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/notifications")}>
          Back to list
        </button>
      </div>
    );
  }

  if (!notification) {
    return <AdminPageLoadingState label="Loading notification…" />;
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
          <h2 className="user-page__title">Notification details</h2>
        </div>
        <Link to="edit" className="btn btn--accent user-page__edit-link">
          Edit notification
        </Link>
      </div>

      <div className="page-card user-view-card">
        <div style={{ marginBottom: 16 }}>
          <AdminMediaImage path={notification.image} width={320} height={200} radius={8} alt="Notification" style={{ width: "100%", maxHeight: 250 }} />
        </div>
        <div className="user-view-grid">
          <DetailRow label="Audience" value={audienceLabel(notification.audienceType)} />
          <DetailRow label="Status" value={notification.status} />
          <DetailRow label="Sent" value={formatDateTime(notification.sentAt)} />
          <DetailRow label="Created" value={formatDateTime(notification.createdAt)} />
          <DetailRow label="Updated" value={formatDateTime(notification.updatedAt)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Message</strong>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{notification.message || "—"}</div>
        </div>
      </div>
    </div>
  );
}
