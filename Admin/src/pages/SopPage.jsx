import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { PageHeader } from "../components/shared.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";
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
  SOP_STEP_MAX_COUNT,
  SOP_STEP_MAX_LEN,
  SOP_STEPS_TEXT_MAX_LEN,
  SOP_TITLE_MAX_LEN,
  formatSopDate,
  sanitizeSopStepsText,
  sanitizeSopTitle,
  stepsToText,
  textToSteps,
  validateSopCategory,
  validateSopStepsText,
  validateSopTitle,
  withStepCount,
} from "../data/sopData.js";

const EMPTY_FORM = {
  title: "",
  category: "onboarding",
  stepsText: "",
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

function SopFormModal({ mode, initial, saving, onClose, onSubmit }) {
  const [form, setForm] = useState(() => ({
    title: initial?.title || "",
    category: initial?.category || "onboarding",
    stepsText: stepsToText(initial?.steps),
  }));
  const [errors, setErrors] = useState({});

  const stepCount = textToSteps(form.stepsText).length;

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
    const stepsErr = validateSopStepsText(form.stepsText);
    if (stepsErr) next.stepsText = stepsErr;
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
      steps: textToSteps(form.stepsText),
    });
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
              {mode === "edit" ? "Edit SOP" : "New SOP"}
            </div>
            <div className="ua-sop-modal__sub">Wellness coaches see this as read-only.</div>
          </div>
          <button type="button" className="ua-sop-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="ua-sop-modal__body" onSubmit={handleSubmit} noValidate>
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

          <label className="ua-sop-field">
            <span className="ua-sop-field__label">Category *</span>
            <select
              className={`ua-sop-field__input${errors.category ? " is-invalid" : ""}`}
              value={form.category}
              onChange={(e) => {
                setForm((f) => ({ ...f, category: e.target.value }));
                clearError("category");
              }}
            >
              {SOP_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.category ? <span className="ua-sop-field__error">{errors.category}</span> : null}
          </label>

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
  const { can } = useViewAs();
  const canCreate = can("console.sop.create");
  const canEdit = can("console.sop.edit");
  const canDelete = can("console.sop.delete");
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteAsk, setDeleteAsk] = useState(null);

  const loadSops = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const token = getAdminToken();
    if (!token) {
      setSops([]);
      setLoadError("Sign in as admin to load SOPs.");
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

  const sorted = useMemo(
    () => [...sops].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))),
    [sops]
  );

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
        subtitle="Written by the Admin desk. Wellness coaches read these — they cannot change them."
        actions={
          canCreate ? (
            <button type="button" className="ua-sop-btn-new" onClick={() => setModal({ mode: "create", sop: null })}>
              + New SOP
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
          No SOPs yet. Create the first one for your wellness coaches.
        </div>
      ) : (
        <div className="ua-sop-list">
          {sorted.map((sop) => {
            const open = expandedId === sop.id;
            const stepCount = sop.stepCount ?? (sop.steps?.length || 0);
            return (
              <article key={sop.id} className={`ua-sop-card${open ? " ua-sop-card--open" : ""}`}>
                <div className="ua-sop-card__row">
                  <div className="ua-sop-card__main">
                    <CategoryBadge category={sop.category} />
                    <div className="ua-sop-card__copy">
                      <h2 className="ua-sop-card__title">{sop.title}</h2>
                      <p className="ua-sop-card__meta">
                        Updated {formatSopDate(sop.updatedAt)}
                        <span className="ua-sop-card__dot">·</span>
                        by {sop.author || "Admin desk"}
                        <span className="ua-sop-card__dot">·</span>
                        {stepCount} {stepCount === 1 ? "step" : "steps"}
                      </p>
                    </div>
                  </div>
                  <div className="ua-sop-card__actions">
                    <button
                      type="button"
                      className={`ua-sop-action${open ? " ua-sop-action--active" : ""}`}
                      onClick={() => setExpandedId(open ? null : sop.id)}
                    >
                      {open ? "Hide" : "Read"}
                    </button>
                    {canEdit ? (
                      <button
                        type="button"
                        className="ua-sop-action ua-sop-action--edit"
                        onClick={() => setModal({ mode: "edit", sop })}
                      >
                        Edit
                      </button>
                    ) : null}
                    {canDelete ? (
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

                {open ? (
                  <ol className="ua-sop-steps">
                    {(sop.steps || []).map((step, i) => (
                      <li key={`${sop.id}-${i}`} className="ua-sop-steps__item">
                        <span className="ua-sop-steps__num">{i + 1}</span>
                        <span className="ua-sop-steps__text">{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {modal ? (
        <SopFormModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.sop : EMPTY_FORM}
          saving={saving}
          onClose={() => !saving && setModal(null)}
          onSubmit={modal.mode === "edit" ? handleUpdate : handleCreate}
        />
      ) : null}

      {deleteAsk ? (
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
