import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PageHeader } from "../components/shared.jsx";
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
  formatSopDate,
  stepsToText,
  textToSteps,
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

  const canSubmit =
    form.title.trim().length > 0 &&
    textToSteps(form.stepsText).length > 0 &&
    !saving;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
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

        <form className="ua-sop-modal__body" onSubmit={handleSubmit}>
          <label className="ua-sop-field">
            <span className="ua-sop-field__label">Title</span>
            <input
              className="ua-sop-field__input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Handling a missed check-in"
              autoFocus
            />
          </label>

          <label className="ua-sop-field">
            <span className="ua-sop-field__label">Category</span>
            <select
              className="ua-sop-field__input"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {SOP_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="ua-sop-field">
            <span className="ua-sop-field__label">Steps — one per line</span>
            <textarea
              className="ua-sop-field__textarea"
              value={form.stepsText}
              onChange={(e) => setForm((f) => ({ ...f, stepsText: e.target.value }))}
              placeholder="Write one step per line"
              rows={7}
            />
          </label>

          <div className="ua-sop-modal__actions">
            <button type="button" className="btn btn--outline" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="ua-sop-modal__primary" disabled={!canSubmit}>
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
          <button type="button" className="ua-sop-btn-new" onClick={() => setModal({ mode: "create", sop: null })}>
            + New SOP
          </button>
        }
      />

      {loading ? (
        <div className="ua-sop-empty">Loading SOPs…</div>
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
                    <button
                      type="button"
                      className="ua-sop-action ua-sop-action--edit"
                      onClick={() => setModal({ mode: "edit", sop })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ua-sop-action ua-sop-action--icon"
                      aria-label={`Delete ${sop.title}`}
                      onClick={() => setDeleteAsk(sop)}
                    >
                      ×
                    </button>
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
