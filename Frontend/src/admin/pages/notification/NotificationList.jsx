import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTableLoaderRow } from "../../components/AdminLoader.jsx";
import { AdminMediaImage } from "../../components/AdminMediaImage.jsx";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdEditSquare, MdSend } from "react-icons/md";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import {
  adminDeleteNotification,
  adminListNotifications,
  adminResendNotification,
  adminUpdateNotification,
} from "../../api/notificationController.js";
import { logout } from "../../../store/authSlice.js";
import {
  LIST_AUDIENCE_OPTIONS,
  LIST_LIMIT,
  audienceLabel,
  formatDateTime,
  pillBarStyle,
  pillButtonStyle,
} from "./NotificationShared.js";
import { audienceIcon } from "./NotificationIcons.jsx";

export function NotificationList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const [resendingId, setResendingId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [listAudience, setListAudience] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [listStatus, setListStatus] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(listSearch.trim()), 400);
    return () => clearTimeout(t);
  }, [listSearch]);

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { notifications, pagination } = await adminListNotifications(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listAudience ? { audienceType: listAudience } : {}),
        ...(listStatus ? { status: listStatus } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      setRows(notifications);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load notifications." });
    } finally {
      setLoading(false);
    }
  }, [adminToken, debouncedSearch, dispatch, listAudience, listStatus, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, listAudience, listStatus]);

  const onDelete = async (row) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete notification?",
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken) return;
    try {
      await adminDeleteNotification(adminToken, row._id);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete." });
    }
  };

  const onResend = async (row) => {
    if (!adminToken || row.status !== "active") return;
    const { isConfirmed } = await Swal.fire({
      icon: "question",
      title: "Resend notification?",
      showCancelButton: true,
      confirmButtonText: "Resend",
    });
    if (!isConfirmed) return;
    setResendingId(row._id);
    try {
      const { message } = await adminResendNotification(adminToken, row._id);
      await Swal.fire({ icon: "success", title: "Resent", text: message || "Notification resent." });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Resend failed", text: e.message || "Could not resend." });
    } finally {
      setResendingId("");
    }
  };

  const onToggleStatus = async (row) => {
    if (!adminToken) return;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(row._id);
    try {
      await adminUpdateNotification(adminToken, row._id, { status: nextStatus });
      await Swal.fire({ icon: "success", title: "Status updated", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Status update failed", text: e.message || "Could not update status." });
    } finally {
      setTogglingId("");
    }
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} notifications`, [page, pages, total]);

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Notifications</h2>
          <button type="button" className="btn btn--primary" onClick={() => navigate("/admin/notifications/new")}>
            Add notification
          </button>
        </div>
        <div
          style={{
            ...pillBarStyle,
            gridTemplateColumns: `repeat(${LIST_AUDIENCE_OPTIONS.length}, minmax(0, 1fr))`,
            marginBottom: 10,
          }}
        >
          {LIST_AUDIENCE_OPTIONS.map((item) => (
            <button
              key={item.value || "all"}
              type="button"
              onClick={() => setListAudience(item.value)}
              style={pillButtonStyle(listAudience === item.value)}
            >
              {audienceIcon(item.value)}
              {item.label}
            </button>
          ))}
        </div>
        <div className="row g-2" style={{ marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label className="user-field" style={{ flex: "1 1 200px", marginBottom: 0 }}>
            <span className="user-field__label">Search</span>
            <input
              className="user-field__input"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Message or audience…"
            />
          </label>
          <label className="user-field" style={{ flex: "0 1 160px", marginBottom: 0 }}>
            <span className="user-field__label">Status</span>
            <select className="user-field__input" value={listStatus} onChange={(e) => setListStatus(e.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>S No.</th>
                <th>Image</th>
                <th>Audience</th>
                <th>Message</th>
                <th>Sent</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={7} label="Loading notifications..." />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>No notifications found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row._id}>
                    <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                    <td>
                      <AdminMediaImage path={row.image} width={56} height={42} radius={6} alt="" />
                    </td>
                    <td className="data-table__muted">{audienceLabel(row.audienceType)}</td>
                    <td>{row.message || "—"}</td>
                    <td className="data-table__muted">{formatDateTime(row.sentAt)}</td>
                    <td>
                      <button
                        type="button"
                        className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                        role="switch"
                        aria-checked={row.status === "active"}
                        aria-label={`Toggle status for notification ${idx + 1}`}
                        onClick={() => onToggleStatus(row)}
                        disabled={togglingId === row._id}
                      >
                        <span className="settings-switch__knob" aria-hidden />
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/admin/notifications/${row._id}`} className="icon-btn icon-btn--view" title="View">
                          <AiOutlineEye size={18} />
                        </Link>
                        {row.status === "active" ? (
                          <button
                            type="button"
                            className="icon-btn icon-btn--view"
                            title="Resend"
                            disabled={resendingId === row._id}
                            onClick={() => onResend(row)}
                          >
                            <MdSend size={18} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="icon-btn icon-btn--edit"
                          title="Edit"
                          onClick={() => navigate(`/admin/notifications/${row._id}/edit`)}
                        >
                          <MdEditSquare size={18} />
                        </button>
                        <button type="button" className="icon-btn icon-btn--delete" title="Delete" onClick={() => onDelete(row)}>
                          <AiFillDelete size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pages > 1 ? (
          <div className="user-list-pagination">
            <span className="user-list-pagination__info">{pageInfo}</span>
            <div className="user-list-pagination__btns">
              <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </button>
              <button type="button" className="btn btn--ghost" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
