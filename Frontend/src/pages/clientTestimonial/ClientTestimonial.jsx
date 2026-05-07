import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import { FadeLoader } from "react-spinners";
import {
  adminCreateClientTestimonial,
  adminDeleteClientTestimonial,
  adminListClientTestimonials,
  adminUpdateClientTestimonial,
} from "../../api/clientTestimonialsController.js";
import { logout } from "../../store/authSlice.js";
import { mediaUrl } from "../../media.js";
import scrollToTop from "../../utils/scrollToTop";

const LIST_LIMIT = 10;
const NAME_MAX_LEN = 80;
const DESCRIPTION_MAX_LEN = 600;
const SEARCH_MAX_LEN = 120;
const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

function emptyForm() {
  return { name: "", rating: "5", description: "", status: "active" };
}

function sanitizeSingleLine(value, maxLen) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, maxLen);
}

function sanitizeMultiLine(value, maxLen) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, maxLen);
}

function formatDateTime(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

export function ClientTestimonialPage() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewRow, setViewRow] = useState(null);
  const [togglingId, setTogglingId] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [editBaselineProfileImage, setEditBaselineProfileImage] = useState("");
  const fileInputRef = useRef(null);

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { clientTestimonials, pagination } = await adminListClientTestimonials(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listStatus ? { status: listStatus } : {}),
        ...(listSearch.trim() ? { search: listSearch.trim() } : {}),
      });
      setRows(clientTestimonials);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load client testimonials." });
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, listSearch, listStatus, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [listSearch, listStatus]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditId("");
    setProfileFile(null);
    setProfilePreview("");
    setEditBaselineProfileImage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const name = sanitizeSingleLine(form.name, NAME_MAX_LEN).trim();
    const description = sanitizeMultiLine(form.description, DESCRIPTION_MAX_LEN).trim();
    const rating = Number(form.rating);

    if (!name) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Name is required." });
      return;
    }
    if (!description) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Description is required." });
      return;
    }
    if (!editId && !(profileFile instanceof File)) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Profile image is required." });
      return;
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Rating must be between 1 and 5." });
      return;
    }

    const payload = { name, description, rating, file: profileFile, status: form.status || "active" };
    setSaving(true);
    try {
      if (editId) {
        await adminUpdateClientTestimonial(adminToken, editId, payload, profileFile);
        await Swal.fire({ icon: "success", title: "Client testimonial updated", timer: 1500 });
      } else {
        await adminCreateClientTestimonial(adminToken, payload, profileFile);
        await Swal.fire({ icon: "success", title: "Client testimonial created", timer: 1500 });
      }
      resetForm();
      await loadRows();
    } catch (e2) {
      if (e2?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: e2.message || "Could not save client testimonial." });
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (row) => {
    setEditId(row._id);
    setEditBaselineProfileImage(row.profile_image || "");
    setForm({
      name: row.name || "",
      rating: String(row.rating ?? 5),
      description: row.description || "",
      status: row.status || "active",
    });
    setProfileFile(null);
    setProfilePreview(row.profile_image ? mediaUrl(row.profile_image) : "");
    if (fileInputRef.current) fileInputRef.current.value = "";
    scrollToTop();
  };

  const onDelete = async (row) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete testimonial?",
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken) return;
    try {
      await adminDeleteClientTestimonial(adminToken, row._id);
      await Swal.fire({ icon: "success", title: "Client testimonial deleted", timer: 1500 });
      if (editId === row._id) resetForm();
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete client testimonial." });
    }
  };

  const onToggleStatus = async (row) => {
    if (!adminToken) return;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(row._id);
    try {
      await adminUpdateClientTestimonial(adminToken, row._id, { status: nextStatus });
      await Swal.fire({ icon: "success", title: "Status updated", timer: 1500 });
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Status update failed", text: e.message || "Could not update status." });
    } finally {
      setTogglingId("");
    }
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} testimonials`, [page, pages, total]);

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">{editId ? "Edit Client Testimonial" : "Create Client Testimonial"}</h2>
        </div>
        <form onSubmit={onSubmit}>
          <div className="row g-3">
            <label className="user-field col-12 col-md-6">
              <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>Name <span className="required-dot">*</span></span>
                <small>{form.name.length}/{NAME_MAX_LEN}</small>
              </span>
              <input className="user-field__input" value={form.name} maxLength={NAME_MAX_LEN} onChange={(e) => setForm((p) => ({ ...p, name: sanitizeSingleLine(e.target.value, NAME_MAX_LEN) }))} required />
            </label>
            <label className="user-field col-12 col-md-6">
              <span className="user-field__label">Rating <span className="required-dot">*</span></span>
              <select className="user-field__input" value={form.rating} onChange={(e) => setForm((p) => ({ ...p, rating: e.target.value }))} required>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </label>
            <label className="user-field col-12 col-md-6">
              <span className="user-field__label">Status <span className="required-dot">*</span></span>
              <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} required>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="user-field col-12">
              <span className="user-field__label" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>Description <span className="required-dot">*</span></span>
                <small>{form.description.length}/{DESCRIPTION_MAX_LEN}</small>
              </span>
              <textarea className="user-field__input" rows={3} maxLength={DESCRIPTION_MAX_LEN} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: sanitizeMultiLine(e.target.value, DESCRIPTION_MAX_LEN) }))} required />
            </label>
            <label className="user-field col-12">
              <span className="user-field__label">Upload Profile Image (upto 5mb) <span className="required-dot">*</span></span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file && file.size > IMAGE_MAX_SIZE_BYTES) {
                    setProfileFile(null);
                    setProfilePreview(editBaselineProfileImage ? mediaUrl(editBaselineProfileImage) : "");
                    e.target.value = "";
                    void Swal.fire({ icon: "error", title: "Validation error", text: "Image size must be 5 MB or less." });
                    return;
                  }
                  setProfileFile(file);
                  if (file) {
                    setProfilePreview(URL.createObjectURL(file));
                  } else {
                    setProfilePreview(editBaselineProfileImage ? mediaUrl(editBaselineProfileImage) : "");
                  }
                }}
              />
            </label>
          </div>
          {profilePreview ? (
            <div style={{ marginTop: 10 }}>
              <img src={profilePreview} alt="Profile preview" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: "50%" }} />
            </div>
          ) : null}
          <div className="user-form__actions">
            {editId ? <button type="button" className="btn btn--ghost" onClick={resetForm}>Cancel edit</button> : null}
            <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? "Saving…" : editId ? "Update" : "Create"}</button>
          </div>
        </form>
      </div>

      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">Client Testimonials</h2>
        </div>
        <div className="row g-2" style={{ marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label className="user-field" style={{ flex: "1 1 240px", marginBottom: 0 }}>
            <span className="user-field__label">Search</span>
            <input className="user-field__input" value={listSearch} maxLength={SEARCH_MAX_LEN} onChange={(e) => setListSearch(sanitizeSingleLine(e.target.value, SEARCH_MAX_LEN))} placeholder="Name or description..." />
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
                <th>Profile</th>
                <th>Name</th>
                <th>Rating</th>
                <th>Description</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="static-cms-loading"><div style={{ display: "grid", justifyItems: "center", gap: 10 }}><FadeLoader height={12} margin={-1} radius={20} width={4} color="#4f46e5" /><span>Loading testimonials...</span></div></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7}>No client testimonials found.</td></tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row._id}>
                    <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                    <td>{row.profile_image ? <img src={mediaUrl(row.profile_image)} alt="" style={{ width: 46, height: 46, objectFit: "cover", borderRadius: "50%" }} /> : "—"}</td>
                    <td>{row.name || "—"}</td>
                    <td className="data-table__muted">{row.rating ?? "—"}</td>
                    <td>{row.description || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                        role="switch"
                        aria-checked={row.status === "active"}
                        aria-label={`Toggle status for testimonial ${idx + 1}`}
                        onClick={() => onToggleStatus(row)}
                        disabled={togglingId === row._id}
                      >
                        <span className="settings-switch__knob" aria-hidden />
                      </button>
                    </td>
                    <td><div className="row-actions"><button type="button" className="icon-btn icon-btn--view" title="View" onClick={() => setViewRow(row)}><AiOutlineEye size={18} /></button><button type="button" className="icon-btn icon-btn--edit" title="Edit" onClick={() => onEdit(row)}><MdEditSquare size={18} /></button><button type="button" className="icon-btn icon-btn--delete" title="Delete" onClick={() => onDelete(row)}><AiFillDelete size={18} /></button></div></td>
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
              <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
              <button type="button" className="btn btn--ghost" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next</button>
            </div>
          </div>
        ) : null}
      </div>

      {viewRow ? (
        <div role="dialog" aria-modal="true" onClick={() => setViewRow(null)} style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div className="page-card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520 }}>
            <div className="page-card__head" style={{ marginBottom: 12 }}>
              <h2 className="page-card__title">Client Testimonial Details</h2>
              <button type="button" className="btn btn--ghost" onClick={() => setViewRow(null)}>Close</button>
            </div>
            <div className="row g-2">
              {viewRow.profile_image ? (
                <div className="col-12" style={{ marginBottom: 8 }}>
                  <img
                    src={mediaUrl(viewRow.profile_image)}
                    alt={viewRow.name || "Profile"}
                    style={{ width: 84, height: 84, objectFit: "cover", borderRadius: "50%" }}
                  />
                </div>
              ) : null}
              <div className="col-12"><strong>Name:</strong> {viewRow.name || "—"}</div>
              <div className="col-6"><strong>Rating:</strong> {viewRow.rating ?? "—"}</div>
              <div className="col-12"><strong>Description:</strong> {viewRow.description || "—"}</div>
              <div className="col-6"><strong>Status:</strong> {viewRow.status || "—"}</div>
              <div className="col-6"><strong>Created:</strong> {formatDateTime(viewRow.createdAt)}</div>
              {/* <div className="col-6"><strong>Updated:</strong> {formatDateTime(viewRow.updatedAt)}</div> */}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
