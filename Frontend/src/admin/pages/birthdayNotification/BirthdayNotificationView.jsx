import { useEffect, useState } from "react";
import { AdminPageLoadingState } from "../../components/AdminLoader.jsx";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import {
  adminGetBirthdayNotificationById,
  adminResendBirthdayNotification,
} from "../../api/birthdayNotificationController.js";
import { logout } from "../../../store/authSlice.js";
import { NotFoundPage } from "../NotFoundPage.jsx";
import { AdminPageHeader } from "../../components/AdminCrud.jsx";
import { formatDateTime, statusLabel } from "./BirthdayNotificationShared.js";

function DetailRow({ label, value }) {
  return (
    <div className="user-detail-row">
      <span className="user-detail-row__label">{label}</span>
      <span className="user-detail-row__value">{value ?? "—"}</span>
    </div>
  );
}

export function BirthdayNotificationView() {
  const { notificationId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [notification, setNotification] = useState(null);
  const [user, setUser] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!adminToken || !notificationId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await adminGetBirthdayNotificationById(adminToken, notificationId);
        if (cancelled) return;
        if (!data?.notification) {
          setNotFound(true);
          return;
        }
        setNotification(data.notification);
        setUser(data.user);
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) return dispatch(logout());
        if (e?.status === 404) setNotFound(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, notificationId]);

  if (notFound) return <NotFoundPage />;
  if (!notification) return <AdminPageLoadingState label="Loading…" />;

  const onResend = async () => {
    if (!adminToken || resending) return;
    setResending(true);
    try {
      const { notification: updated, message } = await adminResendBirthdayNotification(
        adminToken,
        notification._id
      );
      setNotification(updated);
      await Swal.fire({ icon: "success", title: "Resent", text: message });
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Failed", text: e.message });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="user-page">
      <AdminPageHeader
        title="Birthday notification"
        subtitle="View this birthday notification's delivery details."
        onBack={() => navigate(-1)}
        actions={
          <button type="button" className="btn btn--primary" onClick={onResend} disabled={resending}>
            {resending ? "Resending…" : "Resend"}
          </button>
        }
      />
      <div className="page-card user-view-card">
        <div className="user-view-grid">
          <DetailRow label="User" value={user?.name || notification.userId} />
          <DetailRow label="Date" value={notification.notificationDate} />
          <DetailRow label="Status" value={statusLabel(notification.status)} />
          <DetailRow label="Sent at" value={formatDateTime(notification.sentAt)} />
          <DetailRow label="Created" value={formatDateTime(notification.createdAt)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Message</strong>
          <p style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{notification.message}</p>
        </div>
      </div>
    </div>
  );
}
