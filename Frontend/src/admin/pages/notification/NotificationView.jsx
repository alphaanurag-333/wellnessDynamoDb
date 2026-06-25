import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { adminGetNotificationById, adminResendNotification } from "../../api/notificationController.js";
import { logout } from "../../../store/authSlice.js";
import { AdminDetailBannerImage } from "../../components/AdminDetailBannerImage.jsx";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { formatDateTime } from "./NotificationShared.js";

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
  const [resending, setResending] = useState(false);

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

  const onResend = async () => {
    if (!adminToken || resending) return;
    if (notification.status !== "active") {
      await Swal.fire({
        icon: "warning",
        title: "Cannot resend",
        text: "Only active notifications can be resent.",
      });
      return;
    }
    const { isConfirmed } = await Swal.fire({
      icon: "question",
      title: "Resend notification?",
      text: "Send again to all users with a registered device.",
      showCancelButton: true,
      confirmButtonText: "Resend",
    });
    if (!isConfirmed) return;
    setResending(true);
    try {
      const { notification: updated, message, push } = await adminResendNotification(
        adminToken,
        notification._id || notificationId
      );
      setNotification(updated);
      const icon =
        push?.successCount > 0 ? "success" : push?.reason === "no_tokens" ? "warning" : "info";
      await Swal.fire({ icon, title: "Resend complete", text: message || "Done." });
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Resend failed", text: e.message || "Could not resend." });
    } finally {
      setResending(false);
    }
  };

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
        <div className="user-page__toolbar-actions">
          {notification.status === "active" ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={onResend}
              disabled={resending}
            >
              {resending ? "Resending…" : "Resend"}
            </button>
          ) : null}
          <Link to="edit" className="btn btn--accent">
            Edit notification
          </Link>
        </div>
      </div>

      <div className="page-card user-view-card">
        <AdminDetailBannerImage path={notification.image} alt="Notification" />
        <div className="user-view-grid">
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
