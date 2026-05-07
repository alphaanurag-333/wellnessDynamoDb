import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { FadeLoader } from "react-spinners";
import { adminCreateHealthRecipe, adminGetHealthRecipeById, adminUpdateHealthRecipe } from "../../api/adminHealthRecipes.js";
import { logout } from "../../store/authSlice.js";
import { mediaUrl } from "../../media.js";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  DESCRIPTION_MAX_LEN,
  DESCRIPTION_MIN_LEN,
  IMAGE_MAX_SIZE_BYTES,
  TITLE_MAX_LEN,
  TITLE_MIN_LEN,
  VIDEO_SPECS_MAX_LEN,
  YT_LINK_MAX_LEN,
  emptyForm,
  parseVideoSpecsInput,
  sanitizeDescription,
  sanitizeTitle,
  useHealthConcerns,
  validateForm,
  videoSpecsToText,
} from "./HealthRecipeShared.js";

export function HealthRecipeFormPage({ mode = "create" }) {
  const isEditMode = mode === "edit";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { recipeId = "" } = useParams();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const healthConcerns = useHealthConcerns(adminToken, dispatch);

  const [saving, setSaving] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState("");
  const [editBaselineThumbnail, setEditBaselineThumbnail] = useState("");
  const [editBaselineVideo, setEditBaselineVideo] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [videoName, setVideoName] = useState("");
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    if (!isEditMode || !recipeId || !adminToken) return;
    let cancelled = false;
    setLoadingRecipe(true);
    (async () => {
      try {
        const row = await adminGetHealthRecipeById(adminToken, recipeId);
        if (!row || cancelled) return;
        setEditId(row._id || row.id || recipeId);
        setEditBaselineThumbnail(row.thumbnail || "");
        setEditBaselineVideo(row.video || "");
        setForm({
          healthConcernId: row.healthConcernId || "",
          title: row.title || "",
          description: row.description || "",
          type: row.type || "ytlink",
          ytLink: row.ytLink || "",
          video: row.video || "",
          videoSpecsInput: videoSpecsToText(row.video_specification),
          status: row.status || "active",
        });
        setThumbnailPreview(row.thumbnail ? mediaUrl(row.thumbnail) : "");
        setVideoName(row.video ? String(row.video).split("/").pop() : "");
      } catch (e) {
        if (e?.status === 401) {
          if (!cancelled) dispatch(logout());
          return;
        }
        if (!cancelled) {
          await Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load health recipe." });
          navigate("/admin/health-recipes");
        }
      } finally {
        if (!cancelled) setLoadingRecipe(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch, isEditMode, navigate, recipeId]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditId("");
    setEditBaselineThumbnail("");
    setEditBaselineVideo("");
    setThumbnailFile(null);
    setThumbnailPreview("");
    setVideoFile(null);
    setVideoName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const onTypeChange = (nextType) => {
    setForm((p) => (nextType === "ytlink" ? { ...p, type: "ytlink", video: "" } : { ...p, type: "video", ytLink: "" }));
    if (nextType === "ytlink") {
      setVideoFile(null);
      setVideoName("");
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;
    const validationError = validateForm(form, {
      editId,
      thumbnailFile,
      hasExistingThumbnail: Boolean(editBaselineThumbnail && String(editBaselineThumbnail).trim()),
      videoFile,
      hasExistingVideo: Boolean(editBaselineVideo && String(editBaselineVideo).trim()),
    });
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation error", text: validationError });
      return;
    }
    const payload = {
      healthConcernId: form.healthConcernId.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type || "ytlink",
      ytLink: form.type === "ytlink" ? form.ytLink.trim() : "",
      video: form.type === "video" ? form.video.trim() : "",
      video_specification: parseVideoSpecsInput(form.videoSpecsInput),
      status: form.status || "active",
    };
    setSaving(true);
    try {
      if (editId) {
        await adminUpdateHealthRecipe(adminToken, editId, payload, { thumbnailFile, videoFile: form.type === "video" ? videoFile : null });
        await Swal.fire({ icon: "success", title: "Health recipe updated", timer: 1500 });
      } else {
        await adminCreateHealthRecipe(adminToken, payload, { thumbnailFile, videoFile: form.type === "video" ? videoFile : null });
        await Swal.fire({ icon: "success", title: "Health recipe created", timer: 1500 });
      }
      navigate("/admin/health-recipes");
    } catch (err) {
      if (err?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Save failed", text: err.message || "Could not save." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="user-page">
      <div className="page-card">
        <div className="page-card__head">
          <h2 className="page-card__title">{isEditMode ? "Edit health recipe" : "Create health recipe"}</h2>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/health-recipes")}>
            Back to manage
          </button>
        </div>
        {loadingRecipe ? (
          <div className="static-cms-loading">
            <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
              <FadeLoader height={12} margin={-1} radius={20} width={4} color="#4f46e5" />
              <span>Loading health recipe...</span>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="row g-3">
              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">Health concern <span className="required-dot">*</span></span>
                <select className="user-field__input" value={form.healthConcernId} onChange={(e) => setForm((p) => ({ ...p, healthConcernId: e.target.value }))} required>
                  <option value="">Select concern</option>
                  {healthConcerns.map((c) => <option key={c._id} value={c._id}>{c.title || c._id}</option>)}
                </select>
              </label>
              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">Status</span>
                <select className="user-field__input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">Title <span className="required-dot">*</span></span>
                <input className="user-field__input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: sanitizeTitle(e.target.value) }))} minLength={TITLE_MIN_LEN} maxLength={TITLE_MAX_LEN} required />
                <small className="data-table__muted">{form.title.trim().length}/{TITLE_MAX_LEN} (min {TITLE_MIN_LEN})</small>
              </label>
              <label className="user-field col-12 col-md-6">
                <span className="user-field__label">Type</span>
                <select className="user-field__input" value={form.type} onChange={(e) => onTypeChange(e.target.value)}>
                  <option value="ytlink">YT Link</option>
                  <option value="video">Video</option>
                </select>
              </label>
              <label className="user-field col-12">
                <span className="user-field__label">Description <span className="required-dot">*</span></span>
                <textarea className="user-field__input" rows={4} value={form.description} minLength={DESCRIPTION_MIN_LEN} maxLength={DESCRIPTION_MAX_LEN} onChange={(e) => setForm((p) => ({ ...p, description: sanitizeDescription(e.target.value) }))} required />
                <small className="data-table__muted">{form.description.trim().length}/{DESCRIPTION_MAX_LEN} (min {DESCRIPTION_MIN_LEN})</small>
              </label>
              {form.type === "ytlink" ? (
                <label className="user-field col-12">
                  <span className="user-field__label">YT Link <span className="required-dot">*</span></span>
                  <input className="user-field__input" value={form.ytLink} onChange={(e) => setForm((p) => ({ ...p, ytLink: e.target.value.slice(0, YT_LINK_MAX_LEN) }))} placeholder="https://youtube.com/..." required />
                  <small className="data-table__muted">{form.ytLink.length}/{YT_LINK_MAX_LEN}</small>
                </label>
              ) : (
                <label className="user-field col-12">
                  <span className="user-field__label">Video file <span className="required-dot">*</span></span>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v,.mp4,.webm,.ogg,.mov,.m4v"
                    className="user-field__input"
                    required={!form.video && !editBaselineVideo}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file && !ALLOWED_VIDEO_TYPES.has(file.type)) {
                        setVideoFile(null);
                        setVideoName(editBaselineVideo ? String(editBaselineVideo).split("/").pop() : "");
                        e.target.value = "";
                        void Swal.fire({ icon: "error", title: "Invalid file", text: "Use MP4, WebM, OGG, MOV, or M4V only." });
                        return;
                      }
                      setVideoFile(file);
                      setVideoName(file ? file.name : editBaselineVideo ? String(editBaselineVideo).split("/").pop() : "");
                    }}
                  />
                  <small className="data-table__muted">{videoName || "No video selected"}</small>
                </label>
              )}
              <label className="user-field col-12">
                <span className="user-field__label">Video specification array (comma or newline separated)</span>
                <textarea className="user-field__input" rows={4} value={form.videoSpecsInput} onChange={(e) => setForm((p) => ({ ...p, videoSpecsInput: e.target.value.slice(0, VIDEO_SPECS_MAX_LEN) }))} placeholder={"18 gm protein\nNo carbs"} />
              </label>
              <label className="user-field col-12">
                <span className="user-field__label">Thumbnail image (upto 5 MB) {editId ? "(optional — leave unchanged to keep current)" : <span className="required-dot">*</span>}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
                  className="user-field__input"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
                        setThumbnailFile(null);
                        setThumbnailPreview(editBaselineThumbnail ? mediaUrl(editBaselineThumbnail) : "");
                        e.target.value = "";
                        void Swal.fire({ icon: "error", title: "Invalid file", text: "Use JPEG, PNG, GIF, or WebP only." });
                        return;
                      }
                      if (file.size > IMAGE_MAX_SIZE_BYTES) {
                        setThumbnailFile(null);
                        setThumbnailPreview(editBaselineThumbnail ? mediaUrl(editBaselineThumbnail) : "");
                        e.target.value = "";
                        void Swal.fire({ icon: "error", title: "Validation error", text: "Image must be 5 MB or less." });
                        return;
                      }
                    }
                    setThumbnailFile(file);
                    setThumbnailPreview(file ? URL.createObjectURL(file) : editBaselineThumbnail ? mediaUrl(editBaselineThumbnail) : "");
                  }}
                />
              </label>
            </div>
            {thumbnailPreview ? <div style={{ marginTop: 10 }}><img src={thumbnailPreview} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }} /></div> : null}
            <div className="user-form__actions">
              {isEditMode ? <button type="button" className="btn btn--ghost" onClick={() => navigate("/admin/health-recipes")}>Cancel edit</button> : null}
              {!isEditMode ? <button type="button" className="btn btn--ghost" onClick={resetForm}>Reset</button> : null}
              <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? "Saving..." : editId ? "Update" : "Create"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
