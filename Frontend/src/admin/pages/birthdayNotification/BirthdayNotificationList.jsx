import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminTableLoaderRow } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdSend } from "react-icons/md";
import { AiOutlineEye } from "react-icons/ai";
import {
  adminListBirthdayNotifications,
  adminResendBirthdayNotification,
  adminRunBirthdayJob,
} from "../../api/birthdayNotificationController.js";
import { logout } from "../../../store/authSlice.js";
import {
  LIST_LIMIT,
  STATUS_OPTIONS,
  formatDateTime,
  pillBarStyle,
  pillButtonStyle,
  statusLabel,
} from "./BirthdayNotificationShared.js";

function localTodayDateOnly() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BirthdayNotificationList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runningJob, setRunningJob] = useState(false);
  const [resendingId, setResendingId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [listStatus, setListStatus] = useState("");
  const [listDate, setListDate] = useState(() => localTodayDateOnly());
  const autoJobRanRef = useRef(false);
  const jobInFlightRef = useRef(false);

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { birthdayNotifications, pagination } = await adminListBirthdayNotifications(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listStatus ? { status: listStatus } : {}),
        ...(listDate ? { notificationDate: listDate } : {}),
      });
      setRows(birthdayNotifications);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load." });
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, listDate, listStatus, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [listStatus, listDate]);

  const pageInfo = useMemo(
    () => `Page ${page} of ${pages} · ${total} birthday notification${total === 1 ? "" : "s"}`,
    [page, pages, total]
  );

  const onResend = async (row) => {
    if (!adminToken) return;
    const { isConfirmed } = await Swal.fire({
      icon: "question",
      title: "Resend birthday notification?",
      showCancelButton: true,
      confirmButtonText: "Resend",
    });
    if (!isConfirmed) return;
    setResendingId(row._id);
    try {
      const { message } = await adminResendBirthdayNotification(adminToken, row._id);
      await Swal.fire({ icon: "success", title: "Resent", text: message || "Done." });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Resend failed", text: e.message });
    } finally {
      setResendingId("");
    }
  };

  const runJobForDate = useCallback(
    async (dateOnly, { silent = false } = {}) => {
      if (!adminToken || jobInFlightRef.current) return null;
      jobInFlightRef.current = true;
      setRunningJob(true);
      try {
        const result = await adminRunBirthdayJob(adminToken, { dateOnly });
        if (!silent) {
          await Swal.fire({
            icon: "success",
            title: "Job complete",
            html: `
              <p><strong>Date:</strong> ${result.dateOnly}</p>
              <p><strong>Matched by dob:</strong> ${result.matchedUsers ?? 0}</p>
              <p><strong>Sent:</strong> ${result.sent ?? 0} · <strong>Created:</strong> ${result.created ?? 0} · <strong>Skipped:</strong> ${result.skipped ?? 0}</p>
            `,
            timer: 2500,
            showConfirmButton: true,
          });
        }
        if (!listDate) setListDate(dateOnly);
        await loadRows();
        return result;
      } catch (e) {
        if (e?.status === 401) {
          dispatch(logout());
          return null;
        }
        if (!silent) {
          await Swal.fire({ icon: "error", title: "Job failed", text: e.message });
        }
        return null;
      } finally {
        jobInFlightRef.current = false;
        setRunningJob(false);
      }
    },
    [adminToken, dispatch, listDate, loadRows]
  );

  const onRunJob = () => runJobForDate(listDate || localTodayDateOnly(), { silent: false });

  useEffect(() => {
    if (!adminToken || autoJobRanRef.current) return;
    autoJobRanRef.current = true;
    void runJobForDate(localTodayDateOnly(), { silent: true });
  }, [adminToken, runJobForDate]);

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Birthday notifications</h2>
          <button type="button" className="btn btn--primary" onClick={onRunJob} disabled={runningJob}>
            {runningJob ? "Running…" : "Run job"}
          </button>
        </div>

        <div
          style={{
            ...pillBarStyle,
            gridTemplateColumns: `repeat(${STATUS_OPTIONS.length}, minmax(0, 1fr))`,
            marginBottom: 10,
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value || "all"}
              type="button"
              style={pillButtonStyle(listStatus === opt.value)}
              onClick={() => setListStatus(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="row g-2" style={{ marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label className="user-field" style={{ flex: "0 1 200px", marginBottom: 0 }}>
            <span className="user-field__label">Notification date</span>
            <input
              type="date"
              className="user-field__input"
              value={listDate}
              onChange={(e) => setListDate(e.target.value)}
            />
          </label>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>S No.</th>
                <th>User</th>
                <th>Date</th>
                <th>Status</th>
                <th>Sent</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={6} label="Loading birthday notifications..." />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>No birthday notifications found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row._id}>
                    <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                    <td>{row.user?.name || row.userId}</td>
                    <td className="data-table__muted">{row.notificationDate}</td>
                    <td>{statusLabel(row.status)}</td>
                    <td className="data-table__muted">{formatDateTime(row.sentAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn icon-btn--view"
                          title="View"
                          onClick={() => navigate(`/admin/birthday-notifications/${row._id}`)}
                        >
                          <AiOutlineEye size={18} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn--edit"
                          title="Resend"
                          disabled={resendingId === row._id}
                          onClick={() => onResend(row)}
                        >
                          <MdSend size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 || total > 0 ? (
          <div className="user-list-pagination">
            <span className="user-list-pagination__info">{pageInfo}</span>
            {pages > 1 ? (
              <div className="user-list-pagination__btns">
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
