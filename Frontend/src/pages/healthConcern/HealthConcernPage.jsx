import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import {
  adminCreateHealthConcern,
  adminDeleteHealthConcern,
  adminListHealthConcerns,
  adminUpdateHealthConcern,
} from "../../api/adminHealthConcerns.js";
import { logout } from "../../store/authSlice.js";
import { mediaUrl } from "../../media.js";

function emptyForm() {
  return {
    title: "",
    description: "",
    status: "active",
  };
}

const TITLE_MIN_LEN = 2;
const TITLE_MAX_LEN = 200;
const DESCRIPTION_MIN_LEN = 5;
const DESCRIPTION_MAX_LEN = 2000;
const LIST_SEARCH_MAX_LEN = 120;
const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"]);
const LIST_LIMIT = 10;

function sanitizeTitle(value) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, TITLE_MAX_LEN);
}

function sanitizeDescription(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, DESCRIPTION_MAX_LEN);
}

function truncate(str, max) {
  const s = String(str ?? "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function validateForm(form, { editId, iconFile, hasExistingIcon }) {
  const title = form.title.trim();
  const description = form.description.trim();
  const status = String(form.status || "").trim();

  if (!title) return "Title is required.";
  if (title.length < TITLE_MIN_LEN) return `Title must be at least ${TITLE_MIN_LEN} characters.`;
  if (title.length > TITLE_MAX_LEN) return `Title cannot exceed ${TITLE_MAX_LEN} characters.`;

  if (!description) return "Description is required.";
  if (description.length < DESCRIPTION_MIN_LEN) {
    return `Description must be at least ${DESCRIPTION_MIN_LEN} characters.`;
  }
  if (description.length > DESCRIPTION_MAX_LEN) {
    return `Description cannot exceed ${DESCRIPTION_MAX_LEN} characters.`;
  }

  if (status !== "active" && status !== "inactive") {
    return "Status must be active or inactive.";
  }

  if (!editId) {
    if (!(iconFile instanceof File)) {
      return "Please upload an icon image (JPEG, PNG, GIF, or WebP, max 5 MB).";
    }
  } else if (!(iconFile instanceof File) && !hasExistingIcon) {
    return "Upload an icon image — this record has no icon yet.";
  }

  if (iconFile instanceof File) {
    if (!ALLOWED_IMAGE_TYPES.has(iconFile.type)) {
      return "Icon must be a JPEG, PNG, GIF, or WebP image.";
    }
    if (iconFile.size > IMAGE_MAX_SIZE_BYTES) {
      return "Icon image must be 5 MB or smaller.";
    }
  }

  return "";
}

function formatDate(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

export function HealthConcernPage() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState("");
  const [editBaselineIcon, setEditBaselineIcon] = useState("");
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState("");
  const [togglingId, setTogglingId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const fileInputRef = useRef(null);

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { healthConcerns, pagination } = await adminListHealthConcerns(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listSearch.trim() ? { search: listSearch.trim() } : {}),
        ...(listStatus ? { status: listStatus } : {}),
      });
      setRows(healthConcerns);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load health concerns." });
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, page, listSearch, listStatus]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [listSearch, listStatus]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditId("");
    setEditBaselineIcon("");
    setIconFile(null);
    setIconPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const validationError = validateForm(form, {
      editId,
      iconFile,
      hasExistingIcon: Boolean(editBaselineIcon && String(editBaselineIcon).trim()),
    });
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status || "active",
    };

    setSaving(true);
    try {
      if (editId) {
        await adminUpdateHealthConcern(adminToken, editId, payload, iconFile);
        await Swal.fire({ icon: "success", title: "Health concern updated", timer: 1500 });
      } else {
        await adminCreateHealthConcern(adminToken, payload, iconFile);
        await Swal.fire({ icon: "success", title: "Health concern created", timer: 1500 });
      }
      resetForm();
      await loadRows();
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save." });
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (row) => {
    setEditId(row._id);
    setEditBaselineIcon(row.icon || "");
    setForm({
      title: row.title || "",
      description: row.description || "",
      status: row.status || "active",
    });
    setIconFile(null);
    setIconPreview(row.icon ? mediaUrl(row.icon) : "");
  };

  const onDelete = async (row) => {
    if (editId) return;
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete health concern?",
      text: `This will delete "${row.title}".`,
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken) return;
    try {
      await adminDeleteHealthConcern(adminToken, row._id);
      await Swal.fire({ icon: "success", title: "Deleted", timer: 1500 });
      if (editId === row._id) resetForm();
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete." });
    }
  };

  const onToggleStatus = async (row) => {
    if (!adminToken) return;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(row._id);
    try {
      await adminUpdateHealthConcern(adminToken, row._id, { status: nextStatus });
      await Swal.fire({
        icon: "success",
        title: nextStatus === "active" ? "Activated" : "Deactivated",
        timer: 1500,
      });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Status update failed", text: e.message || "Could not update status." });
    } finally {
      setTogglingId("");
    }
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} items`, [page, pages, total]);

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">{editId ? "Edit health concern" : "Create health concern"}</h2>
        </div>
        <form onSubmit={onSubmit}>
          <div className="row g-3">
            <label className="user-field col-12 col-md-6">
              <span className="user-field__label">
                Title <span className="required-dot">*</span>
              </span>
              <input
                className="user-field__input"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: sanitizeTitle(e.target.value) }))}
                minLength={TITLE_MIN_LEN}
                maxLength={TITLE_MAX_LEN}
                required
              />
              <small className="data-table__muted">
                {form.title.trim().length}/{TITLE_MAX_LEN} (min {TITLE_MIN_LEN})
              </small>
            </label>
            <label className="user-field col-12 col-md-6">
              <span className="user-field__label">Status</span>
              <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="user-field col-12">
              <span className="user-field__label">
                Description <span className="required-dot">*</span>
              </span>
              <textarea
                className="user-field__input"
                rows={4}
                value={form.description}
                minLength={DESCRIPTION_MIN_LEN}
                maxLength={DESCRIPTION_MAX_LEN}
                onChange={(e) => setForm((p) => ({ ...p, description: sanitizeDescription(e.target.value) }))}
                required
              />
              <small className="data-table__muted">
                {form.description.trim().length}/{DESCRIPTION_MAX_LEN} (min {DESCRIPTION_MIN_LEN})
              </small>
            </label>
            <label className="user-field col-12">
              <span className="user-field__label">
                Icon image (upto 5 MB) {editId ? "(optional — leave unchanged to keep current)" : <span className="required-dot">*</span>}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
                className="user-field__input"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file) {
                    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
                      setIconFile(null);
                      setIconPreview(editBaselineIcon ? mediaUrl(editBaselineIcon) : "");
                      e.target.value = "";
                      void Swal.fire({
                        icon: "error",
                        title: "Invalid file",
                        text: "Use JPEG, PNG, GIF, or WebP only.",
                      });
                      return;
                    }
                    if (file.size > IMAGE_MAX_SIZE_BYTES) {
                      setIconFile(null);
                      setIconPreview(editBaselineIcon ? mediaUrl(editBaselineIcon) : "");
                      e.target.value = "";
                      void Swal.fire({ icon: "error", title: "Validation error", text: "Image must be 5 MB or less." });
                      return;
                    }
                  }
                  setIconFile(file);
                  if (file) {
                    setIconPreview(URL.createObjectURL(file));
                  } else {
                    setIconPreview(editBaselineIcon ? mediaUrl(editBaselineIcon) : "");
                  }
                }}
              />
    
            </label>
          </div>
          {iconPreview ? (
            <div style={{ marginTop: 10 }}>
              <img src={iconPreview} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }} />
            </div>
          ) : null}
          <div className="user-form__actions">
            {editId ? (
              <button type="button" className="btn btn--ghost" onClick={resetForm}>
                Cancel edit
              </button>
            ) : null}
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Saving…" : editId ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>

      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Health concerns</h2>
        </div>
        <div className="row g-2" style={{ marginBottom: 16, flexWrap: "wrap"}}>
          <label className="user-field" style={{ flex: "1 1 200px", marginBottom: 0 }}>
            <span className="user-field__label">Search</span>
            <input
              className="user-field__input"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value.slice(0, LIST_SEARCH_MAX_LEN))}
              placeholder="Title or description…"
              maxLength={LIST_SEARCH_MAX_LEN}
            />
            <small className="data-table__muted">{listSearch.length}/{LIST_SEARCH_MAX_LEN}</small>
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
                <th>Icon</th>
                <th>Title</th>
                <th>Description</th>
                <th>Created</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>Loading…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>No health concerns found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row._id}>
                    <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                    <td>
                      {row.icon ? (
                        <img src={mediaUrl(row.icon)} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 }} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{row.title || "—"}</td>
                    <td className="data-table__muted" title={row.description || ""}>
                      {truncate(row.description, 80)}
                    </td>
                    <td className="data-table__muted">{formatDate(row.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                        role="switch"
                        aria-checked={row.status === "active"}
                        aria-label={`Toggle status for ${row.title}`}
                        onClick={() => onToggleStatus(row)}
                        disabled={togglingId === row._id}
                        title={row.status === "active" ? "Deactivate" : "Activate"}
                      >
                        <span className="settings-switch__knob" aria-hidden />
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="icon-btn icon-btn--view" title="View" onClick={() => setViewRow(row)}>
                          <AiOutlineEye size={18} />
                        </button>
                        <button type="button" className="icon-btn icon-btn--edit" title="Edit" onClick={() => onEdit(row)}>
                          <MdEditSquare size={18} />
                        </button>
                        <button
                          type="button"
                          className={`icon-btn icon-btn--delete${editId ? " is-disabled" : ""}`}
                          title={editId ? "Finish edit to delete" : "Delete"}
                          onClick={() => onDelete(row)}
                          disabled={Boolean(editId)}
                          style={editId ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
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
              <button type="button" className="btn btn--ghost" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
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
              <h2 className="page-card__title">Health concern</h2>
              <button type="button" className="btn btn--ghost" onClick={() => setViewRow(null)}>
                Close
              </button>
            </div>
            {viewRow.icon ? (
              <div style={{ marginBottom: 12 }}>
                <img
                  src={mediaUrl(viewRow.icon)}
                  alt=""
                  style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }}
                />
              </div>
            ) : null}
            <div className="row g-2">
              <div className="col-12">
                <strong>Title:</strong> {viewRow.title || "—"}
              </div>
              <div className="col-12">
                <strong>Description:</strong>
                <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{viewRow.description || "—"}</div>
              </div>
              <div className="col-6">
                <strong>Status:</strong> {viewRow.status || "—"}
              </div>
              <div className="col-6">
                <strong>Created:</strong> {formatDate(viewRow.createdAt)}
              </div>
              <div className="col-12">
                <strong>Icon path:</strong> <span className="data-table__mono">{viewRow.icon || "—"}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
