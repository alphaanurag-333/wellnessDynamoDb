import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { MdEditSquare, MdGroups } from "react-icons/md";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import { IoSendOutline, IoStorefrontOutline } from "react-icons/io5";
import {
  adminCreateNotification,
  adminDeleteNotification,
  adminListNotifications,
  adminUpdateNotification,
} from "../../api/notificationController.js";
import { logout } from "../../store/authSlice.js";
import { mediaUrl } from "../../media.js";

const SEND_AUDIENCE_OPTIONS = [
  { value: "users", label: "Users", icon: <MdGroups size={16} /> },
  { value: "coaches", label: "Coaches", icon: <IoStorefrontOutline size={16} /> },
];

const LIST_AUDIENCE_OPTIONS = [
  { value: "", label: "All audiences", icon: <MdGroups size={16} /> },
  ...SEND_AUDIENCE_OPTIONS,
];

const LIST_LIMIT = 10;
const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MESSAGE_MAX_LEN = 1000;

function emptyForm(audienceType) {
  return {
    audienceType,
    message: "",
    status: "active",
  };
}

function sanitizeMessageInput(value) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, MESSAGE_MAX_LEN);
}

function audienceLabel(type) {
  return SEND_AUDIENCE_OPTIONS.find((x) => x.value === type)?.label || type || "—";
}

function formatDateTime(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

export function NotificationPage() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [sendAudience, setSendAudience] = useState("users");
  const [listAudience, setListAudience] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState("");
  const [form, setForm] = useState(emptyForm("users"));
  const [editId, setEditId] = useState("");
  const [editBaselineImage, setEditBaselineImage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewRow, setViewRow] = useState(null);
  const fileInputRef = useRef(null);

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { notifications, pagination } = await adminListNotifications(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listAudience ? { audienceType: listAudience } : {}),
        ...(listStatus ? { status: listStatus } : {}),
        ...(listSearch.trim() ? { search: listSearch.trim() } : {}),
      });
      setRows(notifications);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({
        icon: "error",
        title: "Load failed",
        text: e.message || "Failed to load notifications.",
      });
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, listAudience, listSearch, listStatus, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [listAudience, listSearch, listStatus]);

  const resetForm = useCallback(() => {
    setEditId("");
    setEditBaselineImage("");
    setForm(emptyForm(sendAudience));
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [sendAudience]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const message = sanitizeMessageInput(form.message).trim();
    if (!message) {
      await Swal.fire({
        icon: "error",
        title: "Validation error",
        text: "Notification message is required.",
      });
      return;
    }

    const payload = {
      audienceType: form.audienceType,
      message,
      status: form.status || "active",
    };

    setSaving(true);
    try {
      if (editId) {
        await adminUpdateNotification(adminToken, editId, payload, imageFile);
        await Swal.fire({
          icon: "success",
          title: "Notification updated",
          timer: 1500,
        });
      } else {
        await adminCreateNotification(adminToken, payload, imageFile);
        await Swal.fire({
          icon: "success",
          title: "Notification created",
          timer: 1500,
        });
      }
      resetForm();
      await loadRows();
    } catch (e2) {
      if (e2?.status === 401) return dispatch(logout());
      await Swal.fire({
        icon: "error",
        title: "Save failed",
        text: e2.message || "Could not save notification.",
      });
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (row) => {
    const nextAudience = row.audienceType || "users";
    setEditId(row._id);
    setEditBaselineImage(row.image || "");
    setSendAudience(nextAudience);
    setForm({
      audienceType: nextAudience,
      message: row.message || "",
      status: row.status || "active",
    });
    setImageFile(null);
    setImagePreview(row.image ? mediaUrl(row.image) : "");
  };

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
      await Swal.fire({
        icon: "success",
        title: "Notification deleted",
        timer: 1500,
      });
      if (editId === row._id) resetForm();
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: e.message || "Could not delete notification.",
      });
    }
  };

  const onToggleStatus = async (row) => {
    if (!adminToken) return;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(row._id);
    try {
      await adminUpdateNotification(adminToken, row._id, { status: nextStatus });
      await Swal.fire({ icon: "success", title: "Notification status updated", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({
        icon: "error",
        title: "Status update failed",
        text: e.message || "Could not update status.",
      });
    } finally {
      setTogglingId("");
    }
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} notifications`, [page, pages, total]);

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Send Notifications</h2>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              background: "#efeff4",
              borderRadius: 999,
              padding: 4,
              display: "grid",
              gridTemplateColumns: `repeat(${SEND_AUDIENCE_OPTIONS.length}, minmax(0, 1fr))`,
              gap: 4,
            }}
          >
            {SEND_AUDIENCE_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setSendAudience(item.value);
                  setForm((p) => ({ ...p, audienceType: item.value }));
                }}
                style={{
                  border: 0,
                  borderRadius: 999,
                  padding: "8px 10px",
                  background: sendAudience === item.value ? "#fff" : "transparent",
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit}>
            <div className="row g-3">
              <label className="user-field col-12 ">
                <span className="user-field__label">
                  Notification Message <span className="required-dot">*</span>
                </span>
                <textarea
                  className="user-field__input"
                  rows={3}
                  value={form.message}
                  maxLength={MESSAGE_MAX_LEN}
                  onChange={(e) => setForm((p) => ({ ...p, message: sanitizeMessageInput(e.target.value) }))}
                  placeholder={`Enter your message for ${audienceLabel(sendAudience).toLowerCase()}...`}
                  required
                />
                <small className="data-table__muted">
                  {form.message.length}/{MESSAGE_MAX_LEN}
                </small>
              </label>

              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">Status</span>
                <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">Add Image (optional)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && file.size > IMAGE_MAX_SIZE_BYTES) {
                      setImageFile(null);
                      setImagePreview(editBaselineImage ? mediaUrl(editBaselineImage) : "");
                      e.target.value = "";
                      void Swal.fire({
                        icon: "error",
                        title: "Validation error",
                        text: "Image size must be 5 MB or less.",
                      });
                      return;
                    }
                    setImageFile(file);
                    if (file) {
                      setImagePreview(URL.createObjectURL(file));
                    } else {
                      setImagePreview(editBaselineImage ? mediaUrl(editBaselineImage) : "");
                    }
                  }}
                />
              </label>
            </div>

            {imagePreview ? (
              <div style={{ marginTop: 6 }}>
                <img
                  src={imagePreview}
                  alt="Notification preview"
                  style={{ width: 100, height: 60, objectFit: "cover", borderRadius: 8 }}
                />
              </div>
            ) : null}

            <div className="user-form__actions">
              {editId ? (
                <button type="button" className="btn btn--ghost" onClick={resetForm}>
                  Cancel edit
                </button>
              ) : null}
              <button type="submit" className="btn btn--primary" disabled={saving}>
                <IoSendOutline size={16} />
                {saving
                  ? "Saving…"
                  : editId
                  ? `Update for ${audienceLabel(sendAudience)}`
                  : `Save for ${audienceLabel(sendAudience)}`}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Notifications List</h2>
        </div>

        <div
          style={{
            background: "#efeff4",
            borderRadius: 999,
            padding: 4,
            display: "grid",
            gridTemplateColumns: `repeat(${LIST_AUDIENCE_OPTIONS.length}, minmax(0, 1fr))`,
            gap: 4,
            marginBottom: 10,
          }}
        >
          {LIST_AUDIENCE_OPTIONS.map((item) => (
            <button
              key={item.value || "all"}
              type="button"
              onClick={() => setListAudience(item.value)}
              style={{
                border: 0,
                borderRadius: 999,
                padding: "8px 10px",
                background: listAudience === item.value ? "#fff" : "transparent",
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {item.icon}
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
                <tr>
                  <td colSpan={7}>Loading...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>No notifications found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row._id}>
                    <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                    <td>
                      {row.image ? (
                        <img
                          src={mediaUrl(row.image)}
                          alt=""
                          style={{ width: 56, height: 42, objectFit: "cover", borderRadius: 6 }}
                        />
                      ) : (
                        "—"
                      )}
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
                        <button
                          type="button"
                          className="icon-btn icon-btn--view"
                          title="View"
                          onClick={() => setViewRow(row)}
                        >
                          <AiOutlineEye size={18} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn--edit"
                          title="Edit"
                          onClick={() => onEdit(row)}
                        >
                          <MdEditSquare size={18} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn--delete"
                          title="Delete"
                          onClick={() => onDelete(row)}
                        >
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
              <button
                type="button"
                className="btn btn--ghost"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {viewRow ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setViewRow(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="page-card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="page-card__head" style={{ marginBottom: 12 }}>
              <h2 className="page-card__title">Notification Details</h2>
              <button type="button" className="btn btn--ghost" onClick={() => setViewRow(null)}>
                Close
              </button>
            </div>
            {viewRow.image ? (
              <div style={{ marginBottom: 12 }}>
                <img
                  src={mediaUrl(viewRow.image)}
                  alt="Notification"
                  style={{ width: "100%", maxHeight: 250, objectFit: "cover", borderRadius: 8 }}
                />
              </div>
            ) : null}
            <div className="row g-2">
              <div className="col-12">
                <strong>Audience:</strong> {audienceLabel(viewRow.audienceType)}
              </div>
              <div className="col-12">
                <strong>Message:</strong> {viewRow.message || "—"}
              </div>
              <div className="col-6">
                <strong>Status:</strong> {viewRow.status || "—"}
              </div>
              <div className="col-6">
                <strong>Sent:</strong> {formatDateTime(viewRow.sentAt)}
              </div>
              <div className="col-6">
                <strong>Created:</strong> {formatDateTime(viewRow.createdAt)}
              </div>
              <div className="col-6">
                <strong>Updated:</strong> {formatDateTime(viewRow.updatedAt)}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
