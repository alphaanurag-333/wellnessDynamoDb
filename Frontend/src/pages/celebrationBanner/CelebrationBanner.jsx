import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { MdEditSquare, MdCelebration } from "react-icons/md";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import { IoSendOutline, IoTrophyOutline } from "react-icons/io5";
import {
  adminCreateCelebrationBanner,
  adminDeleteCelebrationBanner,
  adminListCelebrationBanners,
  adminUpdateCelebrationBanner,
} from "../../api/celebrationController.js";
import { logout } from "../../store/authSlice.js";
import { mediaUrl } from "../../media.js";
import { FadeLoader } from "react-spinners";
import scrollToTop from "../../utils/scrollToTop.js";

const TYPE_OPTIONS = [
  { value: "birthday", label: "Birthday", icon: <MdCelebration size={16} /> },
  { value: "championship", label: "Championship", icon: <IoTrophyOutline size={16} /> },
];
const LIST_TYPE_OPTIONS = [{ value: "", label: "All", icon: <MdCelebration size={16} /> }, ...TYPE_OPTIONS];

const LIST_LIMIT = 10;
const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const TITLE_MAX_LEN = 200;

function emptyForm(type) {
  return {
    title: "",
    type,
    status: "active",
    startDate: "",
    endDate: "",
  };
}

function sanitizeTitleInput(value) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, TITLE_MAX_LEN);
}

function formatDateTime(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

export function CelebrationBannerPage() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [formType, setFormType] = useState("birthday");
  const [listType, setListType] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState("");
  const [form, setForm] = useState(emptyForm("birthday"));
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
      const { celebrationBanners, pagination } = await adminListCelebrationBanners(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listType ? { type: listType } : {}),
        ...(listStatus ? { status: listStatus } : {}),
        ...(listSearch.trim() ? { search: listSearch.trim() } : {}),
      });
      setRows(celebrationBanners);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({
        icon: "error",
        title: "Load failed",
        text: e.message || "Failed to load celebration banners.",
      });
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, listType, listSearch, listStatus, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [listType, listSearch, listStatus]);

  const resetForm = useCallback(() => {
    setEditId("");
    setEditBaselineImage("");
    setForm(emptyForm(formType));
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [formType]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const title = sanitizeTitleInput(form.title).trim();
    if (!title) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Title is required." });
      return;
    }
    if (!editId && !(imageFile instanceof File)) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Banner image is required." });
      return;
    }

    const payload = {
      title,
      type: form.type || "birthday",
      status: form.status || "active",
      startDate: String(form.startDate || "").trim(),
      endDate: String(form.endDate || "").trim(),
    };

    setSaving(true);
    try {
      if (editId) {
        await adminUpdateCelebrationBanner(adminToken, editId, payload, imageFile);
        await Swal.fire({ icon: "success", title: "Celebration banner updated", timer: 1500 });
      } else {
        await adminCreateCelebrationBanner(adminToken, payload, imageFile);
        await Swal.fire({ icon: "success", title: "Celebration banner created", timer: 1500 });
      }
      resetForm();
      await loadRows();
    } catch (e2) {
      if (e2?.status === 401) return dispatch(logout());
      await Swal.fire({
        icon: "error",
        title: "Save failed",
        text: e2.message || "Could not save celebration banner.",
      });
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (row) => {
    const nextType = row.type || "birthday";
    setEditId(row._id);
    setEditBaselineImage(row.image || "");
    setFormType(nextType);
    setForm({
      title: row.title || "",
      type: nextType,
      status: row.status || "active",
      startDate: row.startDate || "",
      endDate: row.endDate || "",
    });
    setImageFile(null);
    setImagePreview(row.image ? mediaUrl(row.image) : "");
    scrollToTop();
  };

  const onDelete = async (row) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete celebration banner?",
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken) return;
    try {
      await adminDeleteCelebrationBanner(adminToken, row._id);
      await Swal.fire({ icon: "success", title: "Celebration banner deleted", timer: 1500 });
      if (editId === row._id) resetForm();
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: e.message || "Could not delete celebration banner.",
      });
    }
  };

  const onToggleStatus = async (row) => {
    if (!adminToken) return;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(row._id);
    try {
      await adminUpdateCelebrationBanner(adminToken, row._id, { status: nextStatus });
      await Swal.fire({ icon: "success", title: "Celebration status updated", timer: 1500 });
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

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} celebration banners`, [page, pages, total]);

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Create Celebration Banner</h2>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              background: "#efeff4",
              borderRadius: 999,
              padding: 4,
              display: "grid",
              gridTemplateColumns: `repeat(${TYPE_OPTIONS.length}, minmax(0, 1fr))`,
              gap: 4,
            }}
          >
            {TYPE_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setFormType(item.value);
                  setForm((p) => ({ ...p, type: item.value }));
                }}
                style={{
                  border: 0,
                  borderRadius: 999,
                  padding: "8px 10px",
                  background: formType === item.value ? "#fff" : "transparent",
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
              <label className="user-field col-12 col-md-6">
                <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span>
                    Title <span className="required-dot">*</span>
                  </span>
                  <small>
                    {form.title.length}/{TITLE_MAX_LEN}
                  </small>
                </span>
                <input
                  className="user-field__input"
                  value={form.title}
                  maxLength={TITLE_MAX_LEN}
                  onChange={(e) => setForm((p) => ({ ...p, title: sanitizeTitleInput(e.target.value) }))}
                  required
                />
              </label>

              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">Status</span>
                <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">Start Date</span>
                <input className="user-field__input" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
              </label>

              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">End Date</span>
                <input className="user-field__input" type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
              </label>

              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">
                  Add Image (max 5 MB) {editId ? "" : <span className="required-dot">*</span>}
                </span>
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
                  alt="Celebration banner preview"
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
                {saving ? "Saving…" : editId ? "Update celebration banner" : "Create celebration banner"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Celebration Banner List</h2>
        </div>
        <div
          style={{
            background: "#efeff4",
            borderRadius: 999,
            padding: 4,
            display: "grid",
            gridTemplateColumns: `repeat(${LIST_TYPE_OPTIONS.length}, minmax(0, 1fr))`,
            gap: 4,
            marginBottom: 10,
          }}
        >
          {LIST_TYPE_OPTIONS.map((item) => (
            <button
              key={item.value || "all"}
              type="button"
              onClick={() => setListType(item.value)}
              style={{
                border: 0,
                borderRadius: 999,
                padding: "8px 10px",
                background: listType === item.value ? "#fff" : "transparent",
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
              placeholder="Search title..."
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
                <th>Title</th>
                <th>Type</th>
                <th>Schedule</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="static-cms-loading">
                    <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
                      <FadeLoader height={12} margin={-1} radius={20} width={4} color="#4f46e5" />
                      <span>Loading celebration banners...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>No celebration banners found.</td>
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
                    <td>{row.title || "—"}</td>
                    <td className="data-table__muted">{row.type || "—"}</td>
                    <td className="data-table__muted">
                      {row.startDate || "—"} to {row.endDate || "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                        role="switch"
                        aria-checked={row.status === "active"}
                        aria-label={`Toggle status for celebration banner ${idx + 1}`}
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
              <h2 className="page-card__title">Celebration Banner Details</h2>
              <button type="button" className="btn btn--ghost" onClick={() => setViewRow(null)}>
                Close
              </button>
            </div>
            {viewRow.image ? (
              <div style={{ marginBottom: 12 }}>
                <img
                  src={mediaUrl(viewRow.image)}
                  alt="Celebration banner"
                  style={{ width: "100%", maxHeight: 250, objectFit: "cover", borderRadius: 8 }}
                />
              </div>
            ) : null}
            <div className="row g-2">
              <div className="col-12">
                <strong>Title:</strong> {viewRow.title || "—"}
              </div>
              <div className="col-6">
                <strong>Type:</strong> {viewRow.type || "—"}
              </div>
              <div className="col-6">
                <strong>Status:</strong> {viewRow.status || "—"}
              </div>
              <div className="col-6">
                <strong>Start:</strong> {viewRow.startDate || "—"}
              </div>
              <div className="col-6">
                <strong>End:</strong> {viewRow.endDate || "—"}
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
