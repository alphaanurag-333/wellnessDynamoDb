import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { CfgSelect, PageHeader } from "../components/shared.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { UI_TO_ROLE_KEY } from "../api/accountApi.js";
import { fetchAccessRoles } from "../api/accessApi.js";
import {
  adminCreateSop,
  adminDeleteSop,
  adminListSops,
  adminUpdateSop,
  getAdminToken,
} from "../api/sopApi.js";
import {
  SOP_CATEGORIES,
  SOP_CATEGORY_STYLES,
  SOP_CONTENT_TYPES,
  SOP_FILE_MAX_BYTES,
  SOP_STEP_MAX_COUNT,
  SOP_STEP_MAX_LEN,
  SOP_STEPS_TEXT_MAX_LEN,
  SOP_TITLE_MAX_LEN,
  audienceRoleLabel,
  audienceRoleStyle,
  buildSopAudienceOptions,
  defaultSopAudienceRole,
  contentTypeLabel,
  formatSopDate,
  sanitizeSopStepsText,
  sanitizeSopTitle,
  sopVideoEmbedUrl,
  sopVisibleToAudience,
  stepsToText,
  textToSteps,
  validateSopCategory,
  validateSopAudienceRole,
  validateSopContentType,
  validateSopFile,
  validateSopLinkUrl,
  validateSopStepsText,
  validateSopTitle,
  withStepCount,
} from "../data/sopData.js";

const EMPTY_FORM = {
  title: "",
  category: "onboarding",
  contentType: "text",
  audienceRole: "all",
  stepsText: "",
  linkUrl: "",
};

function CategoryBadge({ category }) {
  const style = SOP_CATEGORY_STYLES[category] || SOP_CATEGORY_STYLES.onboarding;
  const label = SOP_CATEGORIES.find((c) => c.id === category)?.label || category;
  return (
    <span
      className="ua-sop-badge"
      style={{ background: style.bg, color: style.color, borderColor: style.border }}
    >
      {String(label).toUpperCase()}
    </span>
  );
}

function AudienceRoleBadge({ audienceRole, accessRoles }) {
  const style = audienceRoleStyle(audienceRole, accessRoles);
  const label = audienceRoleLabel(audienceRole, accessRoles);
  return (
    <span
      className="ua-sop-role-badge"
      style={{ background: style.bg, color: style.color, borderColor: style.border }}
    >
      {label}
    </span>
  );
}

function ContentTypeBadge({ contentType }) {
  return <span className={`ua-sop-type ua-sop-type--${contentType || "text"}`}>{contentTypeLabel(contentType)}</span>;
}

function acceptForContentType(contentType) {
  if (contentType === "word") return ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (contentType === "pdf") return ".pdf,application/pdf";
  if (contentType === "video") return "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";
  return "";
}

function SopMediaView({ sop }) {
  const type = sop.contentType || "text";
  if (type === "text") {
    return (
      <ol className="ua-sop-steps">
        {(sop.steps || []).map((step, i) => (
          <li key={`${sop.id}-${i}`} className="ua-sop-steps__item">
            <span className="ua-sop-steps__num">{i + 1}</span>
            <span className="ua-sop-steps__text">{step}</span>
          </li>
        ))}
      </ol>
    );
  }

  if (type === "word" || type === "pdf") {
    if (!sop.fileUrl) {
      return <p className="ua-sop-media-empty">No file attached.</p>;
    }
    return (
      <div className="ua-sop-media">
        {type === "pdf" ? (
          <iframe title={sop.title} className="ua-sop-media__frame" src={sop.fileUrl} />
        ) : null}
        <a className="ua-sop-media__link" href={sop.fileUrl} target="_blank" rel="noreferrer">
          Open {sop.fileName || (type === "pdf" ? "PDF" : "Word document")}
        </a>
      </div>
    );
  }

  if (type === "video") {
    const embed = sopVideoEmbedUrl(sop.linkUrl);
    if (embed) {
      return (
        <div className="ua-sop-media">
          <div className="ua-sop-media__video">
            <iframe title={sop.title} src={embed} allow="autoplay; fullscreen" allowFullScreen />
          </div>
        </div>
      );
    }
    if (sop.fileUrl) {
      return (
        <div className="ua-sop-media">
          <video className="ua-sop-media__player" src={sop.fileUrl} controls />
          <a className="ua-sop-media__link" href={sop.fileUrl} target="_blank" rel="noreferrer">
            Open {sop.fileName || "video"}
          </a>
        </div>
      );
    }
    return <p className="ua-sop-media-empty">No video attached.</p>;
  }

  return null;
}

function SopFormModal({ mode, initial, saving, accessRoles, onClose, onSubmit }) {
  const fileRef = useRef(null);
  const audienceOptions = useMemo(() => buildSopAudienceOptions(accessRoles), [accessRoles]);
  const [form, setForm] = useState(() => ({
    title: initial?.title || "",
    category: initial?.category || "onboarding",
    contentType: initial?.contentType || "text",
    audienceRole: initial?.audienceRole || defaultSopAudienceRole(accessRoles),
    stepsText: stepsToText(initial?.steps),
    linkUrl: initial?.linkUrl || "",
  }));
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});

  const stepCount = textToSteps(form.stepsText).length;
  const hasExistingFile = Boolean(initial?.fileUrl || initial?.fileKey);

  function clearError(key) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate() {
    const next = {};
    const titleErr = validateSopTitle(form.title);
    if (titleErr) next.title = titleErr;
    const categoryErr = validateSopCategory(form.category);
    if (categoryErr) next.category = categoryErr;
    const roleErr = validateSopAudienceRole(form.audienceRole, accessRoles);
    if (roleErr) next.audienceRole = roleErr;
    const typeErr = validateSopContentType(form.contentType);
    if (typeErr) next.contentType = typeErr;

    if (form.contentType === "text") {
      const stepsErr = validateSopStepsText(form.stepsText);
      if (stepsErr) next.stepsText = stepsErr;
    } else if (form.contentType === "word" || form.contentType === "pdf") {
      const fileErr = validateSopFile(form.contentType, file, {
        required: mode === "create",
        hasExisting: mode === "edit" && hasExistingFile && form.contentType === initial?.contentType,
      });
      if (fileErr) next.file = fileErr;
    } else if (form.contentType === "video") {
      const hasLink = Boolean(String(form.linkUrl || "").trim());
      if (file) {
        const fileErr = validateSopFile("video", file, { required: false });
        if (fileErr) next.file = fileErr;
      } else if (hasLink) {
        const linkErr = validateSopLinkUrl(form.linkUrl, { required: true });
        if (linkErr) next.linkUrl = linkErr;
      } else if (!(mode === "edit" && (hasExistingFile || initial?.linkUrl) && form.contentType === initial?.contentType)) {
        next.file = "Upload a video or paste a YouTube / Vimeo link.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    if (!validate()) return;
    onSubmit({
      title: form.title.trim(),
      category: form.category,
      contentType: form.contentType,
      audienceRole: form.audienceRole,
      steps: form.contentType === "text" ? textToSteps(form.stepsText) : [],
      linkUrl: form.contentType === "video" && !file ? form.linkUrl.trim() : "",
      file: file || undefined,
    });
  }

  function onPickFile(event) {
    const next = event.target.files?.[0] || null;
    event.target.value = "";
    if (!next) return;
    if (next.size > SOP_FILE_MAX_BYTES) {
      setErrors((prev) => ({ ...prev, file: "File must be 100 MB or smaller." }));
      return;
    }
    setFile(next);
    clearError("file");
    if (form.contentType === "video") {
      setForm((f) => ({ ...f, linkUrl: "" }));
      clearError("linkUrl");
    }
  }

  return (
    <div className="ua-dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="ua-sop-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sop-modal-title"
      >
        <div className="ua-sop-modal__head">
          <div>
            <div id="sop-modal-title" className="ua-sop-modal__title">
              {mode === "edit" ? "Edit SOP" : "Upload SOP"}
            </div>
            <div className="ua-sop-modal__sub">
              Text, Word, PDF or Video (local file or YouTube link). Admin only — coaches can view.
            </div>
          </div>
          <button type="button" className="ua-sop-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="ua-sop-modal__form" onSubmit={handleSubmit} noValidate>
        <div className="ua-sop-modal__body">
          <label className="ua-sop-field">
            <span className="ua-sop-field__label-row">
              <span className="ua-sop-field__label">Title *</span>
              <span className="ua-sop-field__count">
                {form.title.trim().length}/{SOP_TITLE_MAX_LEN}
              </span>
            </span>
            <input
              className={`ua-sop-field__input${errors.title ? " is-invalid" : ""}`}
              value={form.title}
              maxLength={SOP_TITLE_MAX_LEN}
              onChange={(e) => {
                setForm((f) => ({ ...f, title: sanitizeSopTitle(e.target.value) }));
                clearError("title");
              }}
              placeholder="e.g. Handling a missed check-in"
              autoFocus
            />
            {errors.title ? <span className="ua-sop-field__error">{errors.title}</span> : (
              <span className="ua-sop-field__hint">At least 3 characters</span>
            )}
          </label>

          <div className="ua-sop-field-grid">
            <div className="ua-sop-field">
              <span className="ua-sop-field__label">Category *</span>
              <CfgSelect
                searchable
                searchPlaceholder="Search categories…"
                className={`ua-sop-field__select${errors.category ? " is-invalid" : ""}`}
                ariaLabel="Category"
                value={form.category}
                options={SOP_CATEGORIES.map((c) => ({
                  id: c.id,
                  value: c.id,
                  label: c.label,
                }))}
                onChange={(value) => {
                  setForm((f) => ({ ...f, category: value }));
                  clearError("category");
                }}
              />
              {errors.category ? <span className="ua-sop-field__error">{errors.category}</span> : null}
            </div>

            <div className="ua-sop-field">
              <span className="ua-sop-field__label">Content type *</span>
              <CfgSelect
                searchable
                searchPlaceholder="Search types…"
                className={`ua-sop-field__select${errors.contentType ? " is-invalid" : ""}`}
                ariaLabel="Content type"
                value={form.contentType}
                options={SOP_CONTENT_TYPES.map((c) => ({
                  id: c.id,
                  value: c.id,
                  label: c.label,
                }))}
                onChange={(value) => {
                  setForm((f) => ({ ...f, contentType: value, linkUrl: value === "video" ? f.linkUrl : "" }));
                  setFile(null);
                  clearError("contentType");
                  clearError("file");
                  clearError("linkUrl");
                  clearError("stepsText");
                }}
              />
              {errors.contentType ? <span className="ua-sop-field__error">{errors.contentType}</span> : null}
            </div>
          </div>

          <div className="ua-sop-field">
            <span className="ua-sop-field__label">For role *</span>
            <CfgSelect
              searchable
              searchPlaceholder="Search roles…"
              className={`ua-sop-field__select${errors.audienceRole ? " is-invalid" : ""}`}
              ariaLabel="Audience role"
              value={form.audienceRole}
              options={audienceOptions}
              onChange={(value) => {
                setForm((f) => ({ ...f, audienceRole: value }));
                clearError("audienceRole");
              }}
            />
            {errors.audienceRole ? (
              <span className="ua-sop-field__error">{errors.audienceRole}</span>
            ) : (
              <span className="ua-sop-field__hint">
                Access Control roles — includes custom roles you create
              </span>
            )}
          </div>

          {form.contentType === "text" ? (
            <label className="ua-sop-field">
              <span className="ua-sop-field__label-row">
                <span className="ua-sop-field__label">Steps — one per line *</span>
                <span className="ua-sop-field__count">
                  {stepCount}/{SOP_STEP_MAX_COUNT} steps
                </span>
              </span>
              <textarea
                className={`ua-sop-field__textarea${errors.stepsText ? " is-invalid" : ""}`}
                value={form.stepsText}
                maxLength={SOP_STEPS_TEXT_MAX_LEN}
                onChange={(e) => {
                  setForm((f) => ({ ...f, stepsText: sanitizeSopStepsText(e.target.value) }));
                  clearError("stepsText");
                }}
                placeholder="Write one step per line"
                rows={7}
              />
              {errors.stepsText ? (
                <span className="ua-sop-field__error">{errors.stepsText}</span>
              ) : (
                <span className="ua-sop-field__hint">
                  One step per line · max {SOP_STEP_MAX_LEN} characters each
                </span>
              )}
            </label>
          ) : null}

          {form.contentType === "word" || form.contentType === "pdf" || form.contentType === "video" ? (
            <div className="ua-sop-field">
              <span className="ua-sop-field__label">
                {form.contentType === "video" ? "Video file" : form.contentType === "pdf" ? "PDF file *" : "Word file *"}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept={acceptForContentType(form.contentType)}
                hidden
                onChange={onPickFile}
              />
              <div className="ua-sop-upload-row">
                <button
                  type="button"
                  className="ua-sop-upload-btn"
                  disabled={saving}
                  onClick={() => fileRef.current?.click()}
                >
                  {file ? "Replace file" : hasExistingFile && form.contentType === initial?.contentType ? "Replace file" : "Choose file"}
                </button>
                <span className="ua-sop-upload-name">
                  {file?.name
                    || (hasExistingFile && form.contentType === initial?.contentType ? initial?.fileName || "Current file attached" : "No file selected")}
                </span>
              </div>
              {errors.file ? <span className="ua-sop-field__error">{errors.file}</span> : (
                <span className="ua-sop-field__hint">
                  {form.contentType === "video"
                    ? "MP4 / WebM / MOV · max 100 MB — or use a link below"
                    : form.contentType === "pdf"
                      ? "PDF · max 100 MB"
                      : "DOC / DOCX · max 100 MB"}
                </span>
              )}
            </div>
          ) : null}

          {form.contentType === "video" ? (
            <label className="ua-sop-field">
              <span className="ua-sop-field__label">YouTube / Vimeo link</span>
              <input
                className={`ua-sop-field__input${errors.linkUrl ? " is-invalid" : ""}`}
                value={form.linkUrl}
                placeholder="https://youtube.com/watch?v=… or vimeo.com/…"
                disabled={Boolean(file)}
                onChange={(e) => {
                  setForm((f) => ({ ...f, linkUrl: e.target.value }));
                  clearError("linkUrl");
                  clearError("file");
                }}
              />
              {errors.linkUrl ? <span className="ua-sop-field__error">{errors.linkUrl}</span> : (
                <span className="ua-sop-field__hint">
                  {file ? "Clear the uploaded file to use a link instead" : "Optional if you upload a local video"}
                </span>
              )}
            </label>
          ) : null}
        </div>

        <div className="ua-sop-modal__actions">
          <button type="button" className="btn btn--outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="ua-sop-modal__primary" disabled={saving}>
            {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Publish SOP"}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}

export function SopPage() {
  const { showToast } = useOutletContext();
  const { isAdminView, viewAs, activeRole } = useViewAs();
  // Upload / edit / delete are Admin-only. Coaches and other roles get view-only.
  const canManage = Boolean(isAdminView);
  const [sops, setSops] = useState([]);
  const [accessRoles, setAccessRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteAsk, setDeleteAsk] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchAccessRoles()
      .then((roles) => {
        if (!cancelled) setAccessRoles(Array.isArray(roles) ? roles : []);
      })
      .catch(() => {
        if (!cancelled) setAccessRoles([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadSops = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const token = getAdminToken();
    if (!token) {
      setSops([]);
      setLoadError("Sign in to load SOPs.");
      setLoading(false);
      return;
    }
    try {
      const { sops: rows } = await adminListSops(token, { limit: 100 });
      setSops((rows || []).map(withStepCount));
    } catch (err) {
      setSops([]);
      setLoadError(err?.message || "Could not load SOPs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSops();
  }, [loadSops]);

  const sorted = useMemo(() => {
    const roleKey = UI_TO_ROLE_KEY[viewAs] || viewAs;
    const matchedRole =
      accessRoles.find((role) => role.roleKey === viewAs)
      || accessRoles.find((role) => role.id === activeRole?.dbId);
    const consoleRoleId = activeRole?.dbId || matchedRole?.id || null;
    const visible = isAdminView
      ? sops
      : sops.filter((sop) => sopVisibleToAudience(sop, { consoleRoleId, roleKey, accessRoles }));
    return [...visible].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }, [accessRoles, activeRole, isAdminView, sops, viewAs]);

  async function handleCreate(payload) {
    setSaving(true);
    try {
      const token = getAdminToken();
      const created = await adminCreateSop(token, payload);
      setSops((prev) => [withStepCount(created), ...prev]);
      setModal(null);
      showToast("SOP published");
    } catch (err) {
      showToast(err?.message || "Could not publish SOP");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(payload) {
    if (!modal?.sop?.id) return;
    setSaving(true);
    try {
      const id = modal.sop.id;
      const token = getAdminToken();
      const updated = await adminUpdateSop(token, id, payload);
      setSops((prev) => prev.map((s) => (s.id === id ? withStepCount(updated) : s)));
      setModal(null);
      showToast("SOP updated");
    } catch (err) {
      showToast(err?.message || "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteAsk?.id) return;
    setSaving(true);
    try {
      const token = getAdminToken();
      await adminDeleteSop(token, deleteAsk.id);
      setSops((prev) => prev.filter((s) => s.id !== deleteAsk.id));
      if (expandedId === deleteAsk.id) setExpandedId(null);
      setDeleteAsk(null);
      showToast("SOP deleted");
    } catch (err) {
      showToast(err?.message || "Could not delete SOP");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="content ua-page-enter ua-sop-page">
      <PageHeader
        title="SOP"
        subtitle={
          canManage
            ? "Upload Text, Word, PDF, or Video (file or YouTube). Coaches can view only."
            : "Standard operating procedures from Admin — view only."
        }
        actions={
          canManage ? (
            <button type="button" className="ua-sop-btn-new" onClick={() => setModal({ mode: "create", sop: null })}>
              + Upload SOP
            </button>
          ) : null
        }
      />

      {loading ? (
        <BrandLoader variant="page" label="Loading SOPs…" />
      ) : loadError ? (
        <div className="ua-sop-empty">{loadError}</div>
      ) : sorted.length === 0 ? (
        <div className="ua-sop-empty">
          {canManage ? "No SOPs yet. Upload the first one for your wellness coaches." : "No SOPs available yet."}
        </div>
      ) : (
        <div className="ua-sop-list">
          {sorted.map((sop) => {
            const open = expandedId === sop.id;
            const stepCount = sop.stepCount ?? (sop.steps?.length || 0);
            const type = sop.contentType || "text";
            return (
              <article key={sop.id} className={`ua-sop-card${open ? " ua-sop-card--open" : ""}`}>
                <div className="ua-sop-card__row">
                  <div className="ua-sop-card__main">
                    <div className="ua-sop-card__badges">
                      <CategoryBadge category={sop.category} />
                      <AudienceRoleBadge audienceRole={sop.audienceRole} accessRoles={accessRoles} />
                    </div>
                    <div className="ua-sop-card__copy">
                      <h2 className="ua-sop-card__title">{sop.title}</h2>
                      <p className="ua-sop-card__meta">
                        <ContentTypeBadge contentType={type} />
                        <span className="ua-sop-card__dot">·</span>
                        Updated {formatSopDate(sop.updatedAt)}
                        <span className="ua-sop-card__dot">·</span>
                        by {sop.author || "Admin desk"}
                        {type === "text" ? (
                          <>
                            <span className="ua-sop-card__dot">·</span>
                            {stepCount} {stepCount === 1 ? "step" : "steps"}
                          </>
                        ) : null}
                        {sop.fileName ? (
                          <>
                            <span className="ua-sop-card__dot">·</span>
                            {sop.fileName}
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="ua-sop-card__actions">
                    <button
                      type="button"
                      className={`ua-sop-action${open ? " ua-sop-action--active" : ""}`}
                      onClick={() => setExpandedId(open ? null : sop.id)}
                    >
                      {open ? "Hide" : "View"}
                    </button>
                    {canManage ? (
                      <button
                        type="button"
                        className="ua-sop-action ua-sop-action--edit"
                        onClick={() => setModal({ mode: "edit", sop })}
                      >
                        Edit
                      </button>
                    ) : null}
                    {canManage ? (
                      <button
                        type="button"
                        className="ua-sop-action ua-sop-action--icon"
                        aria-label={`Delete ${sop.title}`}
                        onClick={() => setDeleteAsk(sop)}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </div>

                {open ? <SopMediaView sop={sop} /> : null}
              </article>
            );
          })}
        </div>
      )}

      {modal && canManage ? (
        <SopFormModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.sop : { ...EMPTY_FORM, audienceRole: defaultSopAudienceRole(accessRoles) }}
          accessRoles={accessRoles}
          saving={saving}
          onClose={() => !saving && setModal(null)}
          onSubmit={modal.mode === "edit" ? handleUpdate : handleCreate}
        />
      ) : null}

      {deleteAsk && canManage ? (
        <div className="ua-dialog-backdrop" onClick={() => !saving && setDeleteAsk(null)} role="presentation">
          <div
            className="ua-dialog ua-dialog--confirm"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="ua-dialog__kicker">Delete SOP</div>
            <div className="ua-dialog__title ua-dialog__title--confirm">Remove “{deleteAsk.title}”?</div>
            <p className="ua-dialog__body">
              Wellness coaches will no longer see this procedure. This cannot be undone.
            </p>
            <div className="ua-dialog__actions">
              <button type="button" className="btn btn--outline" disabled={saving} onClick={() => setDeleteAsk(null)}>
                Cancel
              </button>
              <button type="button" className="ua-dialog__btn-danger" disabled={saving} onClick={handleDelete}>
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
