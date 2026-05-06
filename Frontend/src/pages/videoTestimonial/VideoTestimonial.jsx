import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import { FadeLoader } from "react-spinners";
import {
  adminCreateVideoTestimonial,
  adminDeleteVideoTestimonial,
  adminListVideoTestimonials,
  adminUpdateVideoTestimonial,
} from "../../api/videoTestimonialsController.js";
import { logout } from "../../store/authSlice.js";
import { mediaUrl } from "../../media.js";
import scrollToTop from "../../utils/scrollToTop";

const LIST_LIMIT = 10;
const TYPE_OPTIONS = ["link", "video"];
const NAME_MAX_LEN = 100;
const YTLINK_MAX_LEN = 500;
const SEARCH_MAX_LEN = 120;
const VIDEO_MAX_SIZE_BYTES = 50 * 1024 * 1024;
const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

function emptyForm() {
  return { name: "", type: "link", ytLink: "", video: "", profile_image: "" };
}

function formatDateTime(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

export function VideoTestimonialPage() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [listType, setListType] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewRow, setViewRow] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoFileName, setVideoFileName] = useState("");
  const [editBaselineVideo, setEditBaselineVideo] = useState("");
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [editBaselineProfileImage, setEditBaselineProfileImage] = useState("");
  const videoFileInputRef = useRef(null);
  const profileFileInputRef = useRef(null);

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { videoTestimonials, pagination } = await adminListVideoTestimonials(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listType ? { type: listType } : {}),
        ...(listSearch.trim() ? { search: listSearch.trim() } : {}),
      });
      setRows(videoTestimonials);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load video testimonials." });
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, listSearch, listType, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [listSearch, listType]);

  useEffect(() => {
    // Keep fields mutually exclusive by selected type.
    if (form.type === "link") {
      setVideoFile(null);
      setVideoFileName("");
      if (videoFileInputRef.current) videoFileInputRef.current.value = "";
      setForm((p) => ({ ...p, video: "" }));
    } else if (form.type === "video") {
      setForm((p) => ({ ...p, ytLink: "" }));
    }
  }, [form.type]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditId("");
    setVideoFile(null);
    setVideoFileName("");
    setEditBaselineVideo("");
    setProfileImageFile(null);
    setProfilePreview("");
    setEditBaselineProfileImage("");
    if (videoFileInputRef.current) videoFileInputRef.current.value = "";
    if (profileFileInputRef.current) profileFileInputRef.current.value = "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const payload = {
      name: String(form.name || "").replace(/\s+/g, " ").slice(0, NAME_MAX_LEN).trim(),
      type: String(form.type || "link").trim().toLowerCase(),
      ytLink: String(form.ytLink || "").slice(0, YTLINK_MAX_LEN).trim(),
    };

    if (!payload.name) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Name is required." });
      return;
    }
    if (!editId && !(profileImageFile instanceof File)) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Profile image upload is required." });
      return;
    }
    if (!TYPE_OPTIONS.includes(payload.type)) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Type must be link or video." });
      return;
    }
    if (payload.type === "link" && !payload.ytLink) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "ytLink is required for link type." });
      return;
    }
    if (payload.type === "video" && !editId && !(videoFile instanceof File)) {
      await Swal.fire({ icon: "error", title: "Validation error", text: "Video file upload is required for video type." });
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await adminUpdateVideoTestimonial(adminToken, editId, {
          ...payload,
          profileImageFile,
          videoFile,
        });
        await Swal.fire({ icon: "success", title: "Video testimonial updated", timer: 1500 });
      } else {
        await adminCreateVideoTestimonial(adminToken, {
          ...payload,
          profileImageFile,
          videoFile,
        });
        await Swal.fire({ icon: "success", title: "Video testimonial created", timer: 1500 });
      }
      resetForm();
      await loadRows();
    } catch (e2) {
      if (e2?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: e2.message || "Could not save video testimonial." });
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (row) => {
    setEditId(row._id);
    setEditBaselineVideo(row.video || "");
    setEditBaselineProfileImage(row.profile_image || "");
    setForm({
      name: row.name || "",
      type: row.type || "link",
      ytLink: row.ytLink || "",
      video: row.video || "",
      profile_image: row.profile_image || "",
    });
    setVideoFile(null);
    setVideoFileName("");
    setProfileImageFile(null);
    setProfilePreview(row.profile_image ? mediaUrl(row.profile_image) : "");
    if (videoFileInputRef.current) videoFileInputRef.current.value = "";
    if (profileFileInputRef.current) profileFileInputRef.current.value = "";
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
      await adminDeleteVideoTestimonial(adminToken, row._id);
      await Swal.fire({ icon: "success", title: "Video testimonial deleted", timer: 1500 });
      if (editId === row._id) resetForm();
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Delete failed", text: e.message || "Could not delete video testimonial." });
    }
  };

  const pageInfo = useMemo(() => `Page ${page} of ${pages} · ${total} testimonials`, [page, pages, total]);

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">{editId ? "Edit Video Testimonial" : "Create Video Testimonial"}</h2>
        </div>
        <form onSubmit={onSubmit}>
          <div className="row g-3">
            <label className="user-field col-12 col-md-6">
              <span className="user-field__label">Name <span className="required-dot">*</span></span>
              <input className="user-field__input" maxLength={NAME_MAX_LEN} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </label>
            <label className="user-field col-12 col-md-6">
              <span className="user-field__label">Upload Profile Image <span className="required-dot">*</span></span>
              <input
                ref={profileFileInputRef}
                className="user-field__input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file && file.size > IMAGE_MAX_SIZE_BYTES) {
                    setProfileImageFile(null);
                    setProfilePreview(editBaselineProfileImage ? mediaUrl(editBaselineProfileImage) : "");
                    e.target.value = "";
                    void Swal.fire({ icon: "error", title: "Validation error", text: "Profile image must be 5 MB or less." });
                    return;
                  }
                  setProfileImageFile(file);
                  if (file) {
                    setProfilePreview(URL.createObjectURL(file));
                  } else {
                    setProfilePreview(editBaselineProfileImage ? mediaUrl(editBaselineProfileImage) : "");
                  }
                }}
              />
            </label>
            <label className="user-field col-12 col-md-6">
              <span className="user-field__label">Type <span className="required-dot">*</span></span>
              <select className="user-field__input" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                <option value="link">Link</option>
                <option value="video">Video</option>
              </select>
            </label>
            <label className="user-field col-12">
              <span className="user-field__label">YouTube Link {form.type === "link" ? <span className="required-dot">*</span> : null}</span>
              <input className="user-field__input" maxLength={YTLINK_MAX_LEN} value={form.ytLink} onChange={(e) => setForm((p) => ({ ...p, ytLink: e.target.value }))} disabled={form.type !== "link"} required={form.type === "link"} />
            </label>
            {form.type === "video" ? (
              <label className="user-field col-12">
                <span className="user-field__label">Upload Video File <span className="required-dot">*</span></span>
                <input
                  ref={videoFileInputRef}
                  className="user-field__input"
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && file.size > VIDEO_MAX_SIZE_BYTES) {
                      setVideoFile(null);
                      setVideoFileName("");
                      e.target.value = "";
                      void Swal.fire({ icon: "error", title: "Validation error", text: "Video size must be 50 MB or less." });
                      return;
                    }
                    setVideoFile(file);
                    setVideoFileName(file ? file.name : "");
                  }}
                />
                {videoFileName ? <small className="data-table__muted">{videoFileName}</small> : editBaselineVideo ? <small className="data-table__muted">Current video selected</small> : null}
              </label>
            ) : null}
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
          <h2 className="page-card__title">Video Testimonials</h2>
        </div>
        <div className="row g-2" style={{ marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label className="user-field" style={{ flex: "1 1 240px", marginBottom: 0 }}>
            <span className="user-field__label">Search</span>
            <input className="user-field__input" maxLength={SEARCH_MAX_LEN} value={listSearch} onChange={(e) => setListSearch(e.target.value)} placeholder="Name..." />
          </label>
          <label className="user-field" style={{ flex: "0 1 160px", marginBottom: 0 }}>
            <span className="user-field__label">Type</span>
            <select className="user-field__input" value={listType} onChange={(e) => setListType(e.target.value)}>
              <option value="">All</option>
              <option value="link">Link</option>
              <option value="video">Video</option>
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
                <th>Type</th>
                <th>Content</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="static-cms-loading"><div style={{ display: "grid", justifyItems: "center", gap: 10 }}><FadeLoader height={12} margin={-1} radius={20} width={4} color="#4f46e5" /><span>Loading testimonials...</span></div></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6}>No video testimonials found.</td></tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row._id}>
                    <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                    <td>{row.profile_image ? <img src={mediaUrl(row.profile_image)} alt="" style={{ width: 46, height: 46, objectFit: "cover", borderRadius: "50%" }} /> : "—"}</td>
                    <td>{row.name || "—"}</td>
                    <td className="data-table__muted">{row.type || "—"}</td>
                    <td>
                      {row.type === "video" && row.video ? (
                        <video src={row.video} controls style={{ width: 180, maxWidth: "100%", borderRadius: 6 }} />
                      ) : row.type === "link" && row.ytLink ? (
                        <a href={row.ytLink} target="_blank" rel="noreferrer">Open Link</a>
                      ) : (
                        "—"
                      )}
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
              <h2 className="page-card__title">Video Testimonial Details</h2>
              <button type="button" className="btn btn--ghost" onClick={() => setViewRow(null)}>Close</button>
            </div>
            <div className="row g-2">
              {viewRow.profile_image ? (
                <div className="col-12" style={{ marginBottom: 8 }}>
                  <img src={mediaUrl(viewRow.profile_image)} alt={viewRow.name || "Profile"} style={{ width: 84, height: 84, objectFit: "cover", borderRadius: "50%" }} />
                </div>
              ) : null}
              <div className="col-12"><strong>Name:</strong> {viewRow.name || "—"}</div>
              <div className="col-12"><strong>Type:</strong> {viewRow.type || "—"}</div>
              {viewRow.type === "link" ? (
                <div className="col-12">
                  <strong>YouTube Link:</strong>{" "}
                  {viewRow.ytLink ? <a href={viewRow.ytLink} target="_blank" rel="noreferrer">{viewRow.ytLink}</a> : "—"}
                </div>
              ) : (
                <div className="col-12">
                  <strong>Video:</strong>
                  {viewRow.video ? (
                    <div style={{ marginTop: 8 }}>
                      <video src={viewRow.video} controls style={{ width: "100%", maxHeight: 260, borderRadius: 8 }} />
                    </div>
                  ) : (
                    " —"
                  )}
                </div>
              )}
              <div className="col-6"><strong>Created:</strong> {formatDateTime(viewRow.createdAt)}</div>
              {/* <div className="col-6"><strong>Updated:</strong> {formatDateTime(viewRow.updatedAt)}</div> */}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
