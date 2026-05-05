import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiFillDelete, AiOutlineEye } from "react-icons/ai";
import {
  adminCreateTransformation,
  adminDeleteTransformation,
  adminListTransformations,
  adminUpdateTransformation,
} from "../../api/adminTransformations.js";
import { logout } from "../../store/authSlice.js";
import { mediaUrl } from "../../media.js";

function emptyForm() {
  return {
    timeTaken: "",
    achievements: "",
    description: "",
    status: "active",
    userId: "",
  };
}

const ACHIEVEMENTS_MIN_LEN = 2;
const ACHIEVEMENTS_MAX_LEN = 2000;
const DESCRIPTION_MIN_LEN = 5;
const DESCRIPTION_MAX_LEN = 2000;
const LIST_SEARCH_MAX_LEN = 120;
const USER_ID_FILTER_MAX_LEN = 32;
const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"]);
const LIST_LIMIT = 10;

function sanitizeAchievements(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, ACHIEVEMENTS_MAX_LEN);
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

function formatDate(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

function userLabel(row) {
  const u = row?.userId;
  if (!u) return "—";
  if (typeof u === "object") {
    return u.name || u.email || u.phone || "—";
  }
  return "—";
}

function validateForm(form, { editId, oldFile, newFile, hasExistingImages }) {
  const timeTakenRaw = form.timeTaken;
  const timeTaken = Number(timeTakenRaw);
  if (timeTakenRaw === "" || timeTakenRaw === null || timeTakenRaw === undefined) {
    return "Time taken is required.";
  }
  if (!Number.isFinite(timeTaken) || timeTaken < 0) {
    return "Time taken must be a non-negative number.";
  }

  const achievements = form.achievements.trim();
  const description = form.description.trim();
  const status = String(form.status || "").trim();

  if (!achievements) return "Achievements is required.";
  if (achievements.length < ACHIEVEMENTS_MIN_LEN) {
    return `Achievements must be at least ${ACHIEVEMENTS_MIN_LEN} characters.`;
  }
  if (achievements.length > ACHIEVEMENTS_MAX_LEN) {
    return `Achievements cannot exceed ${ACHIEVEMENTS_MAX_LEN} characters.`;
  }

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

  const uid = form.userId.trim();
  if (uid && !/^[a-f\d]{24}$/i.test(uid)) {
    return "User ID must be a valid 24-character hex ObjectId or left empty.";
  }

  if (!editId) {
    if (!(oldFile instanceof File) || !(newFile instanceof File)) {
      return "Please upload both before and after images (JPEG, PNG, GIF, or WebP, max 5 MB each).";
    }
  } else if (!(oldFile instanceof File) && !(newFile instanceof File) && !hasExistingImages) {
    return "This record is missing images; upload before and after images.";
  }

  for (const file of [oldFile, newFile]) {
    if (file instanceof File) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return "Images must be JPEG, PNG, GIF, or WebP.";
      }
      if (file.size > IMAGE_MAX_SIZE_BYTES) {
        return "Each image must be 5 MB or smaller.";
      }
    }
  }

  return "";
}

export function TransformationPage() {
  const dispatch = useDispatch();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState("");
  const [baselineOld, setBaselineOld] = useState("");
  const [baselineNew, setBaselineNew] = useState("");
  const [oldFile, setOldFile] = useState(null);
  const [newFile, setNewFile] = useState(null);
  const [oldPreview, setOldPreview] = useState("");
  const [newPreview, setNewPreview] = useState("");
  const [togglingId, setTogglingId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState("");
  const [listUserId, setListUserId] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const oldInputRef = useRef(null);
  const newInputRef = useRef(null);

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { transformations, pagination } = await adminListTransformations(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listSearch.trim() ? { search: listSearch.trim() } : {}),
        ...(listStatus ? { status: listStatus } : {}),
        ...(listUserId.trim() ? { userId: listUserId.trim() } : {}),
      });
      setRows(transformations);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load transformations." });
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, page, listSearch, listStatus, listUserId]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [listSearch, listStatus, listUserId]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditId("");
    setBaselineOld("");
    setBaselineNew("");
    setOldFile(null);
    setNewFile(null);
    setOldPreview("");
    setNewPreview("");
    if (oldInputRef.current) oldInputRef.current.value = "";
    if (newInputRef.current) newInputRef.current.value = "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    const hasExistingImages = Boolean(
      editId && baselineOld && String(baselineOld).trim() && baselineNew && String(baselineNew).trim()
    );

    const validationError = validateForm(form, {
      editId,
      oldFile,
      newFile,
      hasExistingImages,
    });
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }

    const payload = {
      timeTaken: Number(form.timeTaken),
      achievements: form.achievements.trim(),
      description: form.description.trim(),
      status: form.status || "active",
      userId: form.userId.trim(),
    };

    setSaving(true);
    try {
      if (editId) {
        const hasAnyFile = oldFile instanceof File || newFile instanceof File;
        if (hasAnyFile) {
          await adminUpdateTransformation(adminToken, editId, payload, oldFile, newFile);
        } else {
          await adminUpdateTransformation(adminToken, editId, payload, null, null);
        }
        await Swal.fire({ icon: "success", title: "Transformation updated", timer: 1500 });
      } else {
        await adminCreateTransformation(adminToken, payload, oldFile, newFile);
        await Swal.fire({ icon: "success", title: "Transformation created", timer: 1500 });
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
    setBaselineOld(row.oldImage || "");
    setBaselineNew(row.newImage || "");
    setForm({
      timeTaken: row.timeTaken != null ? String(row.timeTaken) : "",
      achievements: row.achievements || "",
      description: row.description || "",
      status: row.status || "active",
      userId: (() => {
        const u = row.userId;
        if (!u) return "";
        if (typeof u === "object" && u._id) return String(u._id);
        return String(u);
      })(),
    });
    setOldFile(null);
    setNewFile(null);
    setOldPreview(row.oldImage ? mediaUrl(row.oldImage) : "");
    setNewPreview(row.newImage ? mediaUrl(row.newImage) : "");
    if (oldInputRef.current) oldInputRef.current.value = "";
    if (newInputRef.current) newInputRef.current.value = "";
  };

  const onDelete = async (row) => {
    if (editId) return;
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Delete transformation?",
      text: "This will remove the record and its image files.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!isConfirmed || !adminToken) return;
    try {
      await adminDeleteTransformation(adminToken, row._id);
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
      await adminUpdateTransformation(adminToken, row._id, { status: nextStatus }, null, null);
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

  const handleImagePick = (which, e) => {
    const file = e.target.files?.[0] || null;
    const setFile = which === "old" ? setOldFile : setNewFile;
    const setPreview = which === "old" ? setOldPreview : setNewPreview;
    const baseline = which === "old" ? baselineOld : baselineNew;

    if (file) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setFile(null);
        setPreview(baseline ? mediaUrl(baseline) : "");
        e.target.value = "";
        void Swal.fire({ icon: "error", title: "Invalid file", text: "Use JPEG, PNG, GIF, or WebP only." });
        return;
      }
      if (file.size > IMAGE_MAX_SIZE_BYTES) {
        setFile(null);
        setPreview(baseline ? mediaUrl(baseline) : "");
        e.target.value = "";
        void Swal.fire({ icon: "error", title: "Validation error", text: "Image must be 5 MB or less." });
        return;
      }
    }
    setFile(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(baseline ? mediaUrl(baseline) : "");
    }
  };

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">{editId ? "Edit transformation" : "Create transformation"}</h2>
        </div>
        <form onSubmit={onSubmit}>
          <div className="row g-3">
            <label className="user-field col-12 col-md-4">
              <span className="user-field__label">
                Time taken (In Months) <span className="required-dot">*</span>
              </span>
              <input
                className="user-field__input"
                type="number"
                min={0}
                step="any"
                value={form.timeTaken}
                onChange={(e) => setForm((p) => ({ ...p, timeTaken: e.target.value }))}
                required
              />
              <small className="data-table__muted">Numeric value (e.g. 1, 2, 3, etc. in months).</small>
            </label>
            <label className="user-field col-12 col-md-4">
              <span className="user-field__label">Status</span>
              <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="user-field col-12 col-md-4">
              <span className="user-field__label">User ID (optional)</span>
              <input
                className="user-field__input"
                value={form.userId}
                onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value.trim() }))}
                placeholder="Link to a user record"
                autoComplete="off"
              />
            </label>
            <label className="user-field col-12">
              <span className="user-field__label">
                Achievements <span className="required-dot">*</span>
              </span>
              <textarea
                className="user-field__input"
                rows={3}
                value={form.achievements}
                minLength={ACHIEVEMENTS_MIN_LEN}
                maxLength={ACHIEVEMENTS_MAX_LEN}
                onChange={(e) => setForm((p) => ({ ...p, achievements: sanitizeAchievements(e.target.value) }))}
                required
              />
              <small className="data-table__muted">
                {form.achievements.trim().length}/{ACHIEVEMENTS_MAX_LEN} (min {ACHIEVEMENTS_MIN_LEN})
              </small>
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
            <label className="user-field col-12 col-md-6">
              <span className="user-field__label">
                Before image (max 5 MB){" "}
                {!editId ? <span className="required-dot">*</span> : "(optional — replace current)"}
              </span>
              <input
                ref={oldInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
                className="user-field__input"
                onChange={(e) => handleImagePick("old", e)}
              />
            </label>
            <label className="user-field col-12 col-md-6">
              <span className="user-field__label">
                After image (max 5 MB) {!editId ? <span className="required-dot">*</span> : "(optional — replace current)"}
              </span>
              <input
                ref={newInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
                className="user-field__input"
                onChange={(e) => handleImagePick("new", e)}
              />
            </label>
          </div>
          <div className="row g-2" style={{ marginTop: 8 }}>
            {oldPreview ? (
              <div className="col-6 col-md-3">
                <div className="data-table__muted" style={{ marginBottom: 4 }}>
                  Before
                </div>
                <img src={oldPreview} alt="" style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 8 }} />
              </div>
            ) : null}
            {newPreview ? (
              <div className="col-6 col-md-3">
                <div className="data-table__muted" style={{ marginBottom: 4 }}>
                  After
                </div>
                <img src={newPreview} alt="" style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 8 }} />
              </div>
            ) : null}
          </div>
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
          <h2 className="page-card__title">Transformations</h2>
        </div>
        <div className="row g-2" style={{ marginBottom: 16, flexWrap: "wrap" }}>
          <label className="user-field" style={{ flex: "1 1 200px", marginBottom: 0 }}>
            <span className="user-field__label">Search</span>
            <input
              className="user-field__input"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value.slice(0, LIST_SEARCH_MAX_LEN))}
              placeholder="Achievements or description…"
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
                <th>Before</th>
                <th>After</th>
                <th>Achievements</th>
                <th>Time</th>
                <th>User</th>
                <th>Created</th>
                <th>Status</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9}>Loading…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9}>No transformations found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row._id}>
                    <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                    <td>
                      {row.oldImage ? (
                        <img
                          src={mediaUrl(row.oldImage)}
                          alt=""
                          style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 }}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {row.newImage ? (
                        <img
                          src={mediaUrl(row.newImage)}
                          alt=""
                          style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 }}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="data-table__muted" title={row.achievements || ""}>
                      {truncate(row.achievements, 60)}
                    </td>
                    <td>{row.timeTaken != null ? row.timeTaken : "—"}</td>
                    <td className="data-table__muted">{userLabel(row)}</td>
                    <td className="data-table__muted">{formatDate(row.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className={`settings-switch${row.status === "active" ? " settings-switch--on" : ""}`}
                        role="switch"
                        aria-checked={row.status === "active"}
                        aria-label="Toggle status"
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
            style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="page-card__head" style={{ marginBottom: 12 }}>
              <h2 className="page-card__title">Transformation</h2>
              <button type="button" className="btn btn--ghost" onClick={() => setViewRow(null)}>
                Close
              </button>
            </div>
            <div className="row g-2" style={{ marginBottom: 12 }}>
              {viewRow.oldImage ? (
                <div className="col-6">
                  <div className="data-table__muted" style={{ marginBottom: 4 }}>
                    Before
                  </div>
                  <img
                    src={mediaUrl(viewRow.oldImage)}
                    alt=""
                    style={{ width: "100%", borderRadius: 8, objectFit: "cover", maxHeight: 200 }}
                  />
                </div>
              ) : null}
              {viewRow.newImage ? (
                <div className="col-6">
                  <div className="data-table__muted" style={{ marginBottom: 4 }}>
                    After
                  </div>
                  <img
                    src={mediaUrl(viewRow.newImage)}
                    alt=""
                    style={{ width: "100%", borderRadius: 8, objectFit: "cover", maxHeight: 200 }}
                  />
                </div>
              ) : null}
            </div>
            <div className="row g-2">
              <div className="col-12">
                <strong>Time taken:</strong> {viewRow.timeTaken != null ? viewRow.timeTaken : "—"}
              </div>
              <div className="col-12">
                <strong>Achievements:</strong>
                <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{viewRow.achievements || "—"}</div>
              </div>
              <div className="col-12">
                <strong>Description:</strong>
                <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{viewRow.description || "—"}</div>
              </div>
              <div className="col-12">
                <strong>User:</strong> {userLabel(viewRow)}
                {viewRow.userId && typeof viewRow.userId === "object" && viewRow.userId.email ? (
                  <span className="data-table__muted"> ({viewRow.userId.email})</span>
                ) : null}
              </div>
              <div className="col-6">
                <strong>Status:</strong> {viewRow.status || "—"}
              </div>
              <div className="col-6">
                <strong>Created:</strong> {formatDate(viewRow.createdAt)}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
