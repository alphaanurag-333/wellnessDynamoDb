import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminCreateProgramTestimonial,
  adminDeleteProgramTestimonial,
  adminListProgramTestimonials,
  adminReorderProgramTestimonials,
  adminUpdateProgramTestimonial,
} from "../api/programTestimonialApi.js";
import { adminListHealthConcerns } from "../api/healthConcernApi.js";
import {
  mapHealthConcernOptions,
  programTestimonialLabel,
  resolveProgramSelectValue,
} from "../data/programTestimonialsConfigData.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";
import { CfgSelect } from "./shared.jsx";
import { useMediaPicker } from "./useMediaPicker.jsx";

const PAGE_SIZE = 100;

const SORT_OPTIONS = [
  { value: "manual", label: "Manual order" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "program", label: "Program" },
];

function emptyCreateDraft(program = "") {
  return {
    name: "",
    program,
    description: "",
    imageFile: null,
    imagePreview: "",
    live: true,
  };
}

function Panel({ title, subtitle, actions, children }) {
  const hasHead = Boolean(title || subtitle || actions);
  return (
    <section className="ua-cfg-panel">
      {hasHead ? (
        <div className="ua-cfg-panel__head">
          <div className="ua-cfg-panel__copy">
            {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
            {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
          </div>
          {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function ProgramSelect({ options, value, disabled, onChange, className = "" }) {
  const selected = resolveProgramSelectValue(value, options);
  const known = options.some((entry) => entry.value === selected);
  const extra = !known && value ? [{ value, label: programTestimonialLabel(value, options) }] : [];
  return (
    <CfgSelect
      className={`ua-cfg-pt-select ${className}`.trim()}
      options={options.length ? [...extra, ...options] : [{ value: "", label: "No health concerns" }]}
      value={known ? selected : value || ""}
      disabled={disabled || !options.length}
      ariaLabel="Program"
      placeholder="Program"
      onChange={onChange}
    />
  );
}

function CoverDrop({ previewUrl, disabled, onRequestPick, onRemove }) {
  const filled = Boolean(previewUrl);

  return (
    <div className={`ua-cfg-pt-photo${filled ? " is-on" : ""}`}>
      {filled ? <img className="ua-cfg-pt-photo__img" src={previewUrl} alt="" /> : null}
      <span className="ua-cfg-pt-photo__icon" aria-hidden="true">📷</span>
      <strong>Client photo</strong>
      <button
        type="button"
        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
        disabled={disabled}
        onClick={() => onRequestPick?.()}
      >
        {filled ? "Replace photo" : "Upload photo"}
      </button>
      {filled && onRemove ? (
        <button type="button" className="ua-cfg-rc-media-x" aria-label="Remove client photo" disabled={disabled} onClick={onRemove}>×</button>
      ) : null}
    </div>
  );
}

function StoryPreviewCard({ story }) {
  if (!story) {
    return <div className="ua-cfg-pt-preview__empty">Fill the form above to preview the new story.</div>;
  }

  const photo = story.imagePreview || story.profileImage;

  return (
    <div className="ua-cfg-pt-preview__browser">
      <div className="ua-cfg-pt-preview__chrome" aria-hidden="true">
        <span /><span /><span />
      </div>
      <div className="ua-cfg-pt-preview__frame">
        <div
          className={`ua-cfg-pt-preview__hero${photo ? " has-image" : ""}`}
          style={photo ? { backgroundImage: `url(${photo})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          aria-label={String(story.name || "Story preview")}
        />
      </div>
    </div>
  );
}

function StoryEditModal({
  story,
  index,
  liveCount,
  options,
  busy,
  onClose,
  onSave,
  onRequestPickPhoto,
}) {
  const [draft, setDraft] = useState({
    name: String(story.name || ""),
    program: story.program,
    description: String(story.description || ""),
    imagePreview: story.imagePreview || "",
    profileImage: story.profileImage || "",
    imageFile: null,
  });

  useEffect(() => {
    setDraft({
      name: String(story.name || ""),
      program: story.program,
      description: String(story.description || ""),
      imagePreview: story.imagePreview || "",
      profileImage: story.profileImage || "",
      imageFile: null,
    });
  }, [story]);

  useEffect(() => () => {
    if (draft.imagePreview?.startsWith("blob:") && draft.imagePreview !== story.imagePreview) {
      URL.revokeObjectURL(draft.imagePreview);
    }
  }, [draft.imagePreview, story.imagePreview]);

  const photo = draft.imagePreview || draft.profileImage || story.profileImage;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div
        className="ua-cfg-pt-edit-modal ua-cfg-pt-edit-modal--full"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="pt-edit-title"
      >
        <div className="ua-cfg-pt-edit-modal__head">
          <div>
            <h3 id="pt-edit-title" className="ua-cfg-pt-edit-modal__title">
              <span aria-hidden="true">✎</span> Edit testimonial
            </h3>
            <p className="ua-cfg-pt-edit-modal__sub">
              #{index + 1} · {liveCount} live on the website
            </p>
          </div>
          <button type="button" className="ua-cfg-mv-upload-modal__close" aria-label="Close" onClick={onClose}>×</button>
        </div>

        <div className="ua-cfg-pt-edit-modal__body">
          <div className="ua-cfg-pt-edit-modal__grid">
            <div className="ua-cfg-pt-photo-wrap">
              <span className="ua-cfg-pt-field__label">Photo</span>
              <CoverDrop
                previewUrl={photo}
                disabled={busy}
                onRequestPick={() => onRequestPickPhoto?.((croppedFile) => {
                  setDraft((prev) => {
                    if (prev.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(prev.imagePreview);
                    return {
                      ...prev,
                      imageFile: croppedFile,
                      imagePreview: URL.createObjectURL(croppedFile),
                    };
                  });
                })}
              />
            </div>

            <div className="ua-cfg-pt-fields">
              <label className="ua-cfg-pt-field">
                <span className="ua-cfg-pt-field__label">Headline</span>
                <input
                  type="text"
                  className="ua-cfg-pt-field__input"
                  value={draft.name}
                  placeholder="Down 18 kg on Fat Loss"
                  disabled={busy}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>
              <label className="ua-cfg-pt-field">
                <span className="ua-cfg-pt-field__label">Program</span>
                <ProgramSelect
                  options={options}
                  value={draft.program}
                  disabled={busy}
                  onChange={(value) => setDraft((prev) => ({ ...prev, program: value }))}
                />
              </label>
              <label className="ua-cfg-pt-field">
                <span className="ua-cfg-pt-field__label">Description</span>
                <textarea
                  className="ua-cfg-pt-field__textarea"
                  rows={5}
                  value={draft.description}
                  placeholder="Program-specific story..."
                  disabled={busy}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="ua-cfg-mv-upload-modal__foot ua-cfg-pt-edit-modal__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" disabled={busy} onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary"
            disabled={busy}
            onClick={() => onSave({
              id: story.id,
              name: String(draft.name || "").trim(),
              program: draft.program,
              description: String(draft.description || "").trim(),
              imageFile: draft.imageFile,
            })}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function sortStories(list, mode, options) {
  const copy = [...list];
  if (mode === "name-asc") {
    return copy.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }));
  }
  if (mode === "name-desc") {
    return copy.sort((a, b) => String(b.name || "").localeCompare(String(a.name || ""), undefined, { sensitivity: "base" }));
  }
  if (mode === "program") {
    return copy.sort((a, b) => {
      const labelA = programTestimonialLabel(a.program, options);
      const labelB = programTestimonialLabel(b.program, options);
      return labelA.localeCompare(labelB, undefined, { sensitivity: "base" })
        || String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
    });
  }
  return copy.sort((a, b) => (Number(a.sortOrder) || 9999) - (Number(b.sortOrder) || 9999)
    || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export function DynamicProgramTestimonialsSection({ stories, setStories, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [createDraft, setCreateDraft] = useState(() => emptyCreateDraft());
  const [editingId, setEditingId] = useState(null);
  const [sortMode, setSortMode] = useState("manual");
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [cropPending, setCropPending] = useState(null);
  const [concernOptions, setConcernOptions] = useState([]);
  const storiesRef = useRef(stories);
  const createFormRef = useRef(null);

  useEffect(() => {
    storiesRef.current = stories;
  }, [stories]);

  const orderedStories = useMemo(
    () => sortStories(stories, sortMode, concernOptions),
    [stories, sortMode, concernOptions],
  );

  const editing = useMemo(
    () => (editingId ? stories.find((entry) => entry.id === editingId) || null : null),
    [editingId, stories],
  );

  const editingIndex = useMemo(() => {
    if (!editing) return -1;
    return orderedStories.findIndex((entry) => entry.id === editing.id);
  }, [editing, orderedStories]);

  const liveCount = useMemo(() => stories.filter((row) => row.live).length, [stories]);
  const canReorder = sortMode === "manual";
  const previewStory = createDraft.name || createDraft.description || createDraft.imagePreview
    ? createDraft
    : null;

  const loadConcerns = useCallback(async () => {
    try {
      const { healthConcerns } = await adminListHealthConcerns(null, {
        page: 1,
        limit: 200,
        status: "active",
      });
      const options = mapHealthConcernOptions(healthConcerns);
      setConcernOptions(options);
      setCreateDraft((prev) => ({
        ...prev,
        program: prev.program || options[0]?.value || "",
      }));
    } catch (error) {
      setConcernOptions([]);
      onToast(error?.message || "Could not load health concerns");
    }
  }, [onToast]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminListProgramTestimonials(null, {
        page: 1,
        limit: PAGE_SIZE,
      });
      setStories(sortStories(result.items || [], "manual", []));
    } catch (error) {
      setStories([]);
      onToast(error?.message || "Could not load program testimonials");
    } finally {
      setLoading(false);
    }
  }, [onToast, setStories]);

  useEffect(() => {
    loadConcerns();
  }, [loadConcerns]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => () => {
    if (createDraft.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(createDraft.imagePreview);
  }, [createDraft.imagePreview]);

  useEffect(() => () => {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
  }, [cropPending?.previewUrl]);

  function patchItem(id, patch) {
    setStories((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function closeCoverCrop() {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending(null);
  }

  function openCoverCrop(file, onCropped) {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      onToast("Choose an image file");
      return;
    }
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending({
      file,
      previewUrl: URL.createObjectURL(file),
      onCropped,
    });
  }

  const { openPicker, mediaPickerModal } = useMediaPicker({
    accept: "image",
    title: "Choose image",
    onFiles: (file, onCropped) => openCoverCrop(file, onCropped),
    onError: (error) => onToast(error?.message || "Could not attach media"),
  });

  async function confirmCoverCrop(croppedFile, cropError) {
    if (cropError) {
      onToast(cropError.message || "Failed to crop image");
      return;
    }
    if (!croppedFile || !cropPending) return;
    const { onCropped } = cropPending;
    closeCoverCrop();
    onCropped?.(croppedFile);
    onToast("Client photo attached");
  }

  function clearCreatePhoto() {
    setCreateDraft((prev) => {
      if (prev.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(prev.imagePreview);
      return { ...prev, imageFile: null, imagePreview: "" };
    });
  }

  function resetCreateForm() {
    if (createDraft.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(createDraft.imagePreview);
    setCreateDraft(emptyCreateDraft(concernOptions[0]?.value || ""));
  }

  function focusCreateForm() {
    resetCreateForm();
    createFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveNewStory() {
    const name = String(createDraft.name || "").trim();
    const description = String(createDraft.description || "").trim();
    const program = String(createDraft.program || "").trim();
    if (!name || !description) {
      onToast("Add the headline and description");
      return;
    }
    if (!program) {
      onToast("Pick a program / health concern");
      return;
    }
    if (!(createDraft.imageFile instanceof File)) {
      onToast("Add a client photo");
      return;
    }
    setBusy(true);
    try {
      await adminCreateProgramTestimonial(null, {
        name,
        description,
        type: program,
        status: "active",
      }, createDraft.imageFile);
      resetCreateForm();
      onToast("Testimonial added");
      await loadItems();
    } catch (error) {
      onToast(error?.message || "Could not add testimonial");
    } finally {
      setBusy(false);
    }
  }

  async function saveEditStory(next) {
    const name = String(next.name || "").trim();
    const description = String(next.description || "").trim();
    const program = String(next.program || "").trim();
    if (!name || !description) {
      onToast("Add the headline and description");
      return;
    }
    if (!program) {
      onToast("Pick a program / health concern");
      return;
    }
    setBusy(true);
    try {
      const file = next.imageFile instanceof File ? next.imageFile : undefined;
      const saved = await adminUpdateProgramTestimonial(null, next.id, {
        name,
        description,
        type: program,
      }, file);
      patchItem(next.id, { ...saved, imagePreview: "" });
      setEditingId(null);
      onToast("Testimonial saved");
    } catch (error) {
      onToast(error?.message || "Could not save testimonial");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLive(item) {
    if (busy) return;
    const live = !item.live;
    patchItem(item.id, { live, status: live ? "active" : "inactive" });
    try {
      const saved = await adminUpdateProgramTestimonial(null, item.id, { live });
      patchItem(item.id, saved);
    } catch (error) {
      patchItem(item.id, { live: item.live, status: item.status });
      onToast(error?.message || "Could not update visibility");
    }
  }

  async function persistOrder(next) {
    const orderedIds = next.map((entry) => entry.id);
    const saved = await adminReorderProgramTestimonials(null, orderedIds);
    if (Array.isArray(saved) && saved.length) {
      setStories(sortStories(saved, "manual", concernOptions));
      return;
    }
    setStories(next.map((entry, index) => ({ ...entry, sortOrder: index + 1 })));
  }

  async function moveItem(id, dir) {
    if (!canReorder || busy) return;
    const prev = storiesRef.current;
    const idx = prev.findIndex((entry) => entry.id === id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= prev.length) return;
    const copy = [...prev];
    [copy[idx], copy[nextIdx]] = [copy[nextIdx], copy[idx]];
    const next = copy.map((entry, index) => ({ ...entry, sortOrder: index + 1 }));
    setStories(next);
    setBusy(true);
    try {
      await persistOrder(next);
    } catch (error) {
      setStories(prev);
      onToast(error?.message || "Could not reorder stories");
    } finally {
      setBusy(false);
    }
  }

  async function finishDrag(fromId, toId) {
    if (!canReorder || !fromId || !toId || fromId === toId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const previous = storiesRef.current;
    const fromIndex = previous.findIndex((entry) => entry.id === fromId);
    const toIndex = previous.findIndex((entry) => entry.id === toId);
    setDragId(null);
    setDragOverId(null);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const copy = [...previous];
    const [row] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, row);
    const next = copy.map((entry, index) => ({ ...entry, sortOrder: index + 1 }));
    setStories(next);
    setBusy(true);
    try {
      await persistOrder(next);
      onToast("Order updated");
    } catch (error) {
      setStories(previous);
      onToast(error?.message || "Could not reorder stories");
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem() {
    if (!pendingDelete) return;
    const item = pendingDelete;
    setPendingDelete(null);
    setBusy(true);
    try {
      await adminDeleteProgramTestimonial(null, item.id);
      if (editingId === item.id) setEditingId(null);
      onToast("Story removed");
      await loadItems();
    } catch (error) {
      onToast(error?.message || "Could not delete story");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ua-cfg-pt">
      <Panel
        title="Add new testimonial"
        subtitle="Upload a photo, write the headline, then save to publish it live."
      >
        <div className="ua-cfg-pt-editor" ref={createFormRef}>
          <div className="ua-cfg-pt-photo-wrap">
            <span className="ua-cfg-pt-field__label">Photo</span>
            <CoverDrop
              previewUrl={createDraft.imagePreview}
              disabled={busy}
              onRequestPick={() => openPicker((croppedFile) => {
                setCreateDraft((prev) => {
                  if (prev.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(prev.imagePreview);
                  return {
                    ...prev,
                    imageFile: croppedFile,
                    imagePreview: URL.createObjectURL(croppedFile),
                  };
                });
              })}
              onRemove={clearCreatePhoto}
            />
          </div>
          <div className="ua-cfg-pt-fields">
            <label className="ua-cfg-pt-field">
              <span className="ua-cfg-pt-field__label">Headline</span>
              <input
                type="text"
                className="ua-cfg-pt-field__input"
                value={createDraft.name}
                placeholder="Down 18 kg on Fat Loss"
                disabled={busy}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>
            <label className="ua-cfg-pt-field">
              <span className="ua-cfg-pt-field__label">Program</span>
              <ProgramSelect
                options={concernOptions}
                value={createDraft.program}
                disabled={busy}
                onChange={(value) => setCreateDraft((prev) => ({ ...prev, program: value }))}
              />
            </label>
            <label className="ua-cfg-pt-field">
              <span className="ua-cfg-pt-field__label">Description</span>
              <textarea
                className="ua-cfg-pt-field__textarea"
                rows={5}
                value={createDraft.description}
                placeholder="Program-specific story..."
                disabled={busy}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>
            <div className="ua-cfg-pt-editor__foot">
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                disabled={busy}
                onClick={resetCreateForm}
              >
                Clear
              </button>
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                disabled={busy}
                onClick={saveNewStory}
              >
                {busy ? "Saving…" : "Add testimonial"}
              </button>
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Preview"
        subtitle="How this new story appears on the website."
        actions={<span className="ua-cfg-pt-web-chip">Web</span>}
      >
        <StoryPreviewCard story={previewStory} />
      </Panel>

      <Panel
        title="Live on the website"
        subtitle={
          loading
            ? "Loading stories…"
            : `Drag to reorder · toggle to hide without deleting · ${liveCount} live · click a row to edit`
        }
        actions={(
          <div className="ua-cfg-pt-list-actions">
            <CfgSelect
              className="ua-cfg-select--filter ua-cfg-pt-sort"
              options={SORT_OPTIONS}
              value={sortMode}
              onChange={setSortMode}
              ariaLabel="Sort stories"
              placeholder="Sort"
            />
            <button type="button" className="ua-cfg-rc-add" disabled={busy} onClick={focusCreateForm}>
              + Add story
            </button>
          </div>
        )}
      >
        {orderedStories.length ? (
          <div className={`ua-cfg-pt-list${loading ? " is-loading" : ""}`}>
            {orderedStories.map((entry, index) => {
              const isEditing = editingId === entry.id;
              const isDragging = dragId === entry.id;
              const isOver = dragOverId === entry.id && dragId && dragId !== entry.id;
              const orderIndex = stories.findIndex((row) => row.id === entry.id);
              const canMoveUp = canReorder && orderIndex > 0;
              const canMoveDown = canReorder && orderIndex >= 0 && orderIndex < stories.length - 1;
              return (
                <div
                  key={entry.id}
                  className={`ua-cfg-pt-row${isEditing ? " is-selected" : ""}${isDragging ? " is-dragging" : ""}${isOver ? " is-drag-over" : ""}`}
                  onDragOver={(event) => {
                    if (!canReorder) return;
                    event.preventDefault();
                    if (dragOverId !== entry.id) setDragOverId(entry.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    finishDrag(dragId, entry.id);
                  }}
                >
                  <span
                    className="ua-cfg-faq__drag"
                    aria-hidden="true"
                    title={canReorder ? "Drag to reorder" : "Switch to Manual order to reorder"}
                    draggable={canReorder && !busy}
                    onDragStart={() => {
                      if (!canReorder) return;
                      setDragId(entry.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setDragOverId(null);
                    }}
                  >
                    ⠿
                  </span>
                  <button
                    type="button"
                    className="ua-cfg-pt-row__main"
                    onClick={() => setEditingId(entry.id)}
                  >
                    <span className="ua-cfg-faq__num">#{index + 1}</span>
                    <strong>{String(entry.name || "").trim() || "Untitled"}</strong>
                    <span className="ua-cfg-pt-row__tag">
                      {programTestimonialLabel(entry.program, concernOptions) || "Program"}
                    </span>
                  </button>
                  <div className="ua-cfg-pt-row__controls">
                    <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>
                      {entry.live ? "LIVE" : "HIDDEN"}
                    </span>
                    <button
                      type="button"
                      className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
                      aria-pressed={entry.live}
                      aria-label={`${String(entry.name || "story")} ${entry.live ? "on" : "off"}`}
                      disabled={busy}
                      onClick={() => toggleLive(entry)}
                    >
                      <span className="ua-toggle__knob" />
                    </button>
                    <button
                      type="button"
                      className="ua-cfg-icon-btn"
                      aria-label="Move up"
                      disabled={!canMoveUp || busy}
                      onClick={() => moveItem(entry.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="ua-cfg-icon-btn"
                      aria-label="Move down"
                      disabled={!canMoveDown || busy}
                      onClick={() => moveItem(entry.id, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="ua-cfg-icon-btn"
                      aria-label={`Remove ${String(entry.name || "story")}`}
                      disabled={busy}
                      onClick={() => setPendingDelete(entry)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">
            {loading ? "Fetching stories…" : "No stories yet. Use Add new testimonial above."}
          </p>
        )}
        {sortMode !== "manual" ? (
          <p className="ua-cfg-pt-sort-hint">Switch to Manual order to drag or use ↑ ↓ and save the website sequence.</p>
        ) : null}
      </Panel>

      {editing ? (
        <StoryEditModal
          story={editing}
          index={Math.max(0, editingIndex)}
          liveCount={liveCount}
          options={concernOptions}
          busy={busy}
          onClose={() => setEditingId(null)}
          onSave={saveEditStory}
          onRequestPickPhoto={openPicker}
        />
      ) : null}

      <ImageCropModal
        open={Boolean(cropPending)}
        label="client photo"
        file={cropPending?.file}
        previewUrl={cropPending?.previewUrl || ""}
        busy={busy}
        defaultRatio="Original"
        originalAspectCss="3 / 4"
        originalAspectNumber={3 / 4}
        onClose={closeCoverCrop}
        onConfirm={confirmCoverCrop}
      />
      {mediaPickerModal}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag="Program testimonial"
        title={`Delete ${pendingDelete?.name || "this story"}?`}
        body="This permanently removes the testimonial and its uploaded image."
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={deleteItem}
      />
    </div>
  );
}
