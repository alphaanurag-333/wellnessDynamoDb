import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminCreateTransformation,
  adminDeleteTransformation,
  adminListTransformations,
  adminUpdateTransformation,
} from "../api/transformationApi.js";
import { adminGetConfigDropdown, adminListConfigDropdowns } from "../api/configDropdownApi.js";
import {
  TESTIMONIAL_PAGE_SIZE,
  TESTIMONIAL_POINT_SLUG,
  defaultDraftPoints,
  fieldKey,
  mapTestimonialPointOptions,
  pointsToTransformationFields,
} from "../data/testimonialDropdownData.js";
import { formatRecipeDate } from "../data/recipesConfigData.js";
import { asCopyString } from "../data/bannerConfigData.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";
import { ListPagination } from "./shared.jsx";
import { SectionSurfacePanel } from "./SectionSurfacePanel.jsx";
import { useMediaPicker } from "./useMediaPicker.jsx";
import "./transformationConfig.css";

const EMPTY_DRAFT = {
  description: "",
  points: [],
  oldFile: null,
  oldPreview: "",
  newFile: null,
  newPreview: "",
};

const TF_CROP_WIDTH = 200;
const TF_CROP_HEIGHT = 250;
const TF_CROP_RATIO = "4:5";

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div className="ua-cfg-panel__copy">
          {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function PhotoDrop({ previewUrl, disabled, label, tone, onRequestPick, onRemove }) {
  const filled = Boolean(previewUrl);

  return (
    <div className={`ua-cfg-tf-drop ua-cfg-tf-drop--${tone}${filled ? " is-on" : ""}`}>
      {filled ? <img className="ua-cfg-tf-drop__img" src={previewUrl} alt="" /> : null}
      <span className="ua-cfg-tf-drop__icon" aria-hidden="true">📷</span>
      <p className="ua-cfg-tf-drop__label">{label}</p>
      <span className="ua-cfg-tf-drop__size">{TF_CROP_WIDTH}px × {TF_CROP_HEIGHT}px</span>
      <button
        type="button"
        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-tf-drop__btn"
        disabled={disabled}
        onClick={() => onRequestPick?.()}
      >
        {filled ? "Replace photo" : "Upload photo"}
      </button>
      {filled && onRemove ? (
        <button
          type="button"
          className="ua-cfg-rc-media-x"
          aria-label={`Remove ${label}`}
          disabled={disabled}
          onClick={onRemove}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

function DataPointEditor({ points, options, busy, onChange }) {
  const [addOpen, setAddOpen] = useState(false);
  const used = new Set(points.map((row) => fieldKey(row.field)));
  const available = options.filter((row) => !used.has(fieldKey(row.value)));

  return (
    <div className="ua-cfg-tf-points-ed">
      <div className="ua-cfg-tf-add">
        <button
          type="button"
          className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-tf-add-pt"
          disabled={busy}
          onClick={() => setAddOpen((open) => !open)}
        >
          + Add data point
        </button>
        {addOpen ? (
          <div className="ua-cfg-tf-add__menu">
            {available.length ? available.map((entry) => (
              <button
                key={entry.id || entry.value}
                type="button"
                onClick={() => {
                  onChange((prev) => [...prev, {
                    id: `dp-${Date.now()}`,
                    field: entry.value,
                    label: entry.label,
                    value: "",
                    source: "AUTO",
                  }]);
                  setAddOpen(false);
                }}
              >
                {entry.label}
              </button>
            )) : <span>Add options in Configs → Dropdowns</span>}
          </div>
        ) : null}
      </div>
      <div className="ua-cfg-tf-table">
        <div className="ua-cfg-tf-table__head">
          <span>Field</span>
          <span>Value</span>
          <span />
        </div>
        {points.map((entry) => (
          <div key={entry.id} className="ua-cfg-tf-table__row">
            <span>{asCopyString(entry.label)}</span>
            <div className="ua-cfg-tf-table__value">
              <input
                type="text"
                value={asCopyString(entry.value)}
                placeholder={asCopyString(entry.label)}
                disabled={busy}
                onChange={(event) => onChange((prev) => prev.map((row) => (
                  row.id === entry.id ? { ...row, value: event.target.value, source: "EDIT" } : row
                )))}
              />
              <button
                type="button"
                className="ua-cfg-icon-btn"
                aria-label={`Remove ${entry.label}`}
                disabled={busy}
                onClick={() => onChange((prev) => prev.filter((row) => row.id !== entry.id))}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransformationViewModal({ entry, onClose, onEdit }) {
  if (!entry) return null;
  const points = (entry.dataPoints || []).filter((row) => String(row.value || "").trim());
  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-rc-view ua-cfg-rc-view--sheet ua-cfg-tf-view" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="tf-view-title">
        <div className="ua-cfg-rc-view__head">
          <div>
            {/* <p className="ua-cfg-rc-view__tag">Transformation</p> */}
            <h3 id="tf-view-title">{asCopyString(entry.name) || "Untitled client"}</h3>
            {/* <p>{formatRecipeDate(entry.updatedAt)}</p>
            <span className={`ua-cfg-tf-view__status${entry.live ? " is-live" : ""}`}>
              {entry.live ? "Live" : "Hidden"}
            </span> */}
          </div>
          <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-tf-view__body">
          <div className="ua-cfg-tf-view__compare mrgtegrid " style={{gap:"4px"}}>
            <div className="ua-cfg-tf-view__shot" style={{borderTopRightRadius:"0px",borderBottomRightRadius:"0px"}}>
              {entry.oldImage ? <img src={entry.oldImage} alt={`${entry.name} before`} /> : <div className="ua-cfg-tf-view__empty">No before photo</div>}
              <span>Before</span>
            </div>
            <div className="ua-cfg-tf-view__shot" style={{borderTopLeftRadius:"0px",borderBottomLeftRadius:"0px"}}>
              {entry.newImage ? <img src={entry.newImage} alt={`${entry.name} after`} /> : <div className="ua-cfg-tf-view__empty">No after photo</div>}
              <span>After</span>
            </div>
          </div>
          {points.length ? (
            <dl className="ua-cfg-tf-chips">
              {points.map((row) => (
                <div key={row.id || row.field} className="ua-cfg-tf-chip" style={{padding:"5px 7px"}}>
                  <dt style={{fontSize:"9px"}}>{asCopyString(row.label) || row.field}</dt>
                  <dd style={{fontSize:"9px"}}>{asCopyString(row.value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {asCopyString(entry.description) ? <p className="ua-cfg-rc-view__copy" style={{textAlign:"justify",fontSize:"12.5px"}}>{asCopyString(entry.description)}</p> : null}
          
        </div>
        <div className="ua-cfg-rc-view__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>Close</button>
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary"
            onClick={() => {
              onEdit(entry.id);
              onClose();
            }}
          >
            Edit transformation
          </button>
        </div>
      </div>
    </div>
  );
}

export function DynamicTransformationSection({ items, setItems, editor, setEditor, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: TESTIMONIAL_PAGE_SIZE, total: 0, pages: 1 });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [cropPending, setCropPending] = useState(null);
  const [pointOptions, setPointOptions] = useState([]);

  const loadPoints = useCallback(async () => {
    try {
      let list = null;
      try {
        list = await adminGetConfigDropdown(null, TESTIMONIAL_POINT_SLUG);
      } catch {
        const { lists } = await adminListConfigDropdowns(null, { limit: 50 });
        list = (lists || []).find((row) => row.slug === TESTIMONIAL_POINT_SLUG) || null;
      }
      const options = mapTestimonialPointOptions(list);
      setPointOptions(options);
      setDraft((prev) => ({
        ...prev,
        points: prev.points.length ? prev.points : defaultDraftPoints(options),
      }));
    } catch (error) {
      setPointOptions([]);
      onToast(error?.message || "Could not load testimonial data points");
    }
  }, [onToast]);

  const loadItems = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      const result = await adminListTransformations(null, {
        page: nextPage,
        limit: TESTIMONIAL_PAGE_SIZE,
        search: query || undefined,
      });
      const next = result.items || [];
      setItems(next);
      setPagination({
        page: Number(result.pagination?.page) || nextPage,
        limit: Number(result.pagination?.limit) || TESTIMONIAL_PAGE_SIZE,
        total: Number(result.pagination?.total) || next.length,
        pages: Number(result.pagination?.pages) || 1,
      });
      setViewingId((current) => (next.some((row) => row.id === current) ? current : null));
    } catch (error) {
      setItems([]);
      onToast(error?.message || "Could not load transformations");
    } finally {
      setLoading(false);
    }
  }, [onToast, page, query, setItems]);

  useEffect(() => {
    loadPoints();
  }, [loadPoints]);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => () => {
    if (draft.oldPreview?.startsWith("blob:")) URL.revokeObjectURL(draft.oldPreview);
    if (draft.newPreview?.startsWith("blob:")) URL.revokeObjectURL(draft.newPreview);
  }, [draft.oldPreview, draft.newPreview]);

  function patchItem(id, patch) {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function closeCrop() {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending(null);
  }

  function openCrop(file, target) {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      onToast("Choose an image file");
      return;
    }
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending({ file, previewUrl: URL.createObjectURL(file), target });
  }

  const { openPicker, mediaPickerModal } = useMediaPicker({
    accept: "image",
    title: "Choose image",
    cropImages: false,
    cropWidth: TF_CROP_WIDTH,
    cropHeight: TF_CROP_HEIGHT,
    showFrameworks: false,
    onFiles: (file, context) => openCrop(file, context),
    onError: (error) => onToast(error?.message || "Could not attach media"),
  });

  function clearDraftImage(kind) {
    setDraft((prev) => {
      const key = kind === "old" ? "oldPreview" : "newPreview";
      const fileKey = kind === "old" ? "oldFile" : "newFile";
      if (prev[key]?.startsWith("blob:")) URL.revokeObjectURL(prev[key]);
      return { ...prev, [fileKey]: null, [key]: "" };
    });
  }

  async function confirmCrop(croppedFile, cropError) {
    if (cropError) {
      onToast(cropError.message || "Failed to crop image");
      return;
    }
    if (!croppedFile || !cropPending) return;
    const target = cropPending.target;
    closeCrop();
    if (target === "draft-old" || target === "draft-new") {
      const kind = target === "draft-old" ? "old" : "new";
      setDraft((prev) => {
        const key = kind === "old" ? "oldPreview" : "newPreview";
        const fileKey = kind === "old" ? "oldFile" : "newFile";
        if (prev[key]?.startsWith("blob:")) URL.revokeObjectURL(prev[key]);
        return { ...prev, [fileKey]: croppedFile, [key]: URL.createObjectURL(croppedFile) };
      });
      onToast(`${kind === "old" ? "Before" : "After"} photo attached`);
      return;
    }
    const [id, kind] = String(target).split(":");
    setBusy(true);
    try {
      const saved = await adminUpdateTransformation(null, id, {}, {
        [kind === "new" ? "newImage" : "oldImage"]: croppedFile,
      });
      patchItem(id, saved);
      onToast("Photo updated");
    } catch (error) {
      onToast(error?.message || "Could not update the photo");
    } finally {
      setBusy(false);
    }
  }

  async function addItem() {
    const mapped = pointsToTransformationFields(draft.points);
    if (!mapped.name) {
      onToast("Add the client name data point");
      return;
    }
    if (!String(draft.description || "").trim()) {
      onToast("Add the story");
      return;
    }
    if (!(draft.oldFile instanceof File) || !(draft.newFile instanceof File)) {
      onToast("Add before and after photos");
      return;
    }
    setBusy(true);
    try {
      await adminCreateTransformation(null, {
        ...mapped,
        description: draft.description.trim(),
        status: "active",
        order: pagination.total + 1,
      }, { oldImage: draft.oldFile, newImage: draft.newFile });
      clearDraftImage("old");
      clearDraftImage("new");
      setDraft({ ...EMPTY_DRAFT, points: defaultDraftPoints(pointOptions) });
      setCreating(false);
      setPage(1);
      onToast("Transformation added");
      await loadItems(1);
    } catch (error) {
      onToast(error?.message || "Could not add transformation");
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(item) {
    const mapped = pointsToTransformationFields(item.dataPoints || []);
    const name = mapped.name || String(item.name || "").trim();
    const description = String(item.description || "").trim();
    if (!name || !description) {
      onToast("Add the client name and story");
      return;
    }
    setBusy(true);
    try {
      const saved = await adminUpdateTransformation(null, item.id, {
        ...mapped,
        name,
        description,
      });
      patchItem(item.id, saved);
      setEditingId(null);
      onToast("Transformation saved");
    } catch (error) {
      onToast(error?.message || "Could not save transformation");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLive(item) {
    if (busy) return;
    const live = !item.live;
    patchItem(item.id, { live, status: live ? "active" : "inactive" });
    try {
      const saved = await adminUpdateTransformation(null, item.id, { live });
      patchItem(item.id, saved);
    } catch (error) {
      patchItem(item.id, { live: item.live, status: item.status });
      onToast(error?.message || "Could not update visibility");
    }
  }

  async function toggleSurface(item, field) {
    if (busy || (field !== "webVisible" && field !== "appVisible")) return;
    const next = !item[field];
    const prev = item[field];
    patchItem(item.id, { [field]: next });
    try {
      const saved = await adminUpdateTransformation(null, item.id, { [field]: next });
      patchItem(item.id, saved);
    } catch (error) {
      patchItem(item.id, { [field]: prev });
      onToast(error?.message || `Could not update ${field === "webVisible" ? "web" : "app"} visibility`);
    }
  }

  async function moveItem(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    const current = items[index];
    const swap = items[next];
    const currentOrder = Number.isFinite(Number(current.order)) ? current.order : index + 1;
    const swapOrder = Number.isFinite(Number(swap.order)) ? swap.order : next + 1;
    setBusy(true);
    try {
      const [savedCurrent, savedSwap] = await Promise.all([
        adminUpdateTransformation(null, current.id, { order: swapOrder }),
        adminUpdateTransformation(null, swap.id, { order: currentOrder }),
      ]);
      patchItem(current.id, savedCurrent);
      patchItem(swap.id, savedSwap);
      await loadItems();
    } catch (error) {
      onToast(error?.message || "Could not reorder");
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
      await adminDeleteTransformation(null, item.id);
      onToast("Transformation deleted");
      await loadItems();
    } catch (error) {
      onToast(error?.message || "Could not delete transformation");
    } finally {
      setBusy(false);
    }
  }

  const liveCount = useMemo(() => items.filter((row) => row.live).length, [items]);
  const viewing = items.find((row) => row.id === viewingId) || null;

  return (
    <div className="ua-cfg-tf">
      <SectionSurfacePanel
        sectionId="transformation"
        editor={editor}
        setEditor={setEditor}
        onToast={onToast}
      />
      <Panel
        title="Transformations"
        subtitle={loading ? "Loading transformations…" : `${pagination.total} total · ${liveCount} live on this page · data points from Configs → Dropdowns`}
        actions={(
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-tf-add-btn"
            disabled={busy}
            onClick={() => {
              setCreating(true);
              setEditingId(null);
              setViewingId(null);
              setDraft({ ...EMPTY_DRAFT, points: defaultDraftPoints(pointOptions) });
            }}
          >
            + Add transformation
          </button>
        )}
      >
        {creating ? (
          <section className="ua-cfg-rc-new ua-cfg-tf-new">
            <div className="ua-cfg-rc-new__head">
              <strong><span aria-hidden="true"></span> New transformation</strong>
              <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={() => setCreating(false)}>×</button>
            </div>
            <div className="ua-cfg-rc-new__grid ua-cfg-tf-new__grid">
              <div className="ua-cfg-tf-photos">
                <PhotoDrop
                  previewUrl={draft.oldPreview}
                  disabled={busy}
                  label="Before"
                  tone="before"
                  onRequestPick={() => openPicker("draft-old")}
                  onRemove={() => clearDraftImage("old")}
                />
                <PhotoDrop
                  previewUrl={draft.newPreview}
                  disabled={busy}
                  label="After"
                  tone="after"
                  onRequestPick={() => openPicker("draft-new")}
                  onRemove={() => clearDraftImage("new")}
                />
              </div>
              <div className="ua-cfg-tf-new__split">
                <div className="ua-cfg-tf-new__fields">
                  {!pointOptions.length ? (
                    <p className="ua-cfg-panel__sub">Add testimonial data points in Configs → Dropdowns first.</p>
                  ) : (
                    <DataPointEditor
                      points={draft.points}
                      options={pointOptions}
                      busy={busy}
                      onChange={(updater) => setDraft((prev) => ({ ...prev, points: updater(prev.points) }))}
                    />
                  )}
                </div>
                <div className="ua-cfg-tf-new__story-col">
                  <span className="ua-cfg-tf-new__story-label">Story</span>
                  <textarea
                    className="ua-cfg-tf-story ua-cfg-tf-new__story"
                    rows={6}
                    placeholder="Story / caption shown with the photos…"
                    value={asCopyString(draft.description)}
                    disabled={busy}
                    onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </div>
              </div>
              <div className="ua-cfg-tf-new__foot">
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy} onClick={addItem}>
                  {busy ? "Saving…" : "Add transformation"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {/* <div className="ua-cfg-rc-toolbar">
          <input
            type="search"
            className="ua-cfg-dd-search"
            placeholder="Search by client name or story…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search transformations"
          />
        </div> */}

        {items.length ? (
          <div className={`ua-cfg-rc-list${loading ? " is-loading" : ""}`}>
            {items.map((entry, index) => {
              const isEditing = editingId === entry.id;
              const points = (entry.dataPoints || []).filter((row) => String(row.value || "").trim());
              return (
                <article key={entry.id} className={`ua-cfg-rc-item ua-cfg-tf-item${isEditing ? " is-editing" : ""}`}>
                  <div className="ua-cfg-tf-pair">
                    {[["old", "Before", entry.oldImage], ["new", "After", entry.newImage]].map(([kind, label, src]) => (
                      <div key={kind} className="ua-cfg-rc-cover-wrap">
                        <button
                          type="button"
                          className={`ua-cfg-rc-cover ua-cfg-rc-cover--pick${src ? " is-on" : ""}`}
                          disabled={busy}
                          aria-label={`Replace ${label}`}
                          onClick={() => openPicker(`${entry.id}:${kind}`)}
                        >
                          {src ? <img className="ua-cfg-rc-cover__img" src={src} alt="" /> : <span aria-hidden="true">📷</span>}
                          <em>{label}</em>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="ua-cfg-rc-item__body">
                    <div className="ua-cfg-tf-item__head">
                      <div className="ua-cfg-tf-item__identity">
                        <strong>{asCopyString(entry.name)}</strong>
                        <p className="ua-cfg-panel__sub">{formatRecipeDate(entry.updatedAt)}</p>
                      </div>
                      <div className="ua-cfg-tf-item__actions">
                        <div className="ua-cfg-tf-item__surfaces">
                          <div className="ua-cfg-tf-item__live">
                            <span className={`ua-cfg-faq__shown${entry.webVisible ? " is-on" : ""}`}>
                              WEB
                            </span>
                            <button
                              type="button"
                              className={`ua-toggle ua-toggle--sm${entry.webVisible ? " ua-toggle--on" : ""}`}
                              aria-pressed={entry.webVisible}
                              aria-label={entry.webVisible ? "Hide on web" : "Show on web"}
                              disabled={busy}
                              onClick={() => toggleSurface(entry, "webVisible")}
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                          </div>
                          <div className="ua-cfg-tf-item__live">
                            <span className={`ua-cfg-faq__shown${entry.appVisible ? " is-on" : ""}`}>
                              APP
                            </span>
                            <button
                              type="button"
                              className={`ua-toggle ua-toggle--sm${entry.appVisible ? " ua-toggle--on" : ""}`}
                              aria-pressed={entry.appVisible}
                              aria-label={entry.appVisible ? "Hide on app" : "Show on app"}
                              disabled={busy}
                              onClick={() => toggleSurface(entry, "appVisible")}
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                          </div>
                          <div className="ua-cfg-tf-item__live">
                            <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>
                              {entry.live ? "LIVE" : "HIDDEN"}
                            </span>
                            <button
                              type="button"
                              className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
                              aria-pressed={entry.live}
                              disabled={busy}
                              onClick={() => toggleLive(entry)}
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                          </div>
                        </div>
                        <div className="ua-cfg-tf-item__moves">
                          <button type="button" className="ua-cfg-icon-btn" disabled={busy || index === 0} onClick={() => moveItem(index, -1)} aria-label="Move up">↑</button>
                          <button type="button" className="ua-cfg-icon-btn" disabled={busy || index === items.length - 1} onClick={() => moveItem(index, 1)} aria-label="Move down">↓</button>
                        </div>
                        <div className="ua-cfg-tf-item__btns">
                          <button
                            type="button"
                            className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                            disabled={busy}
                            onClick={() => setViewingId(entry.id)}
                          >
                            View
                          </button>
                          {isEditing ? (
                            <>
                              <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" disabled={busy} onClick={() => saveItem(entry)}>Save</button>
                              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={busy} onClick={() => { setEditingId(null); loadItems(); }}>Cancel</button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                              disabled={busy}
                              onClick={() => { setViewingId(null); setEditingId(entry.id); setCreating(false); }}
                            >
                              Edit
                            </button>
                          )}
                          <button type="button" className="ua-cfg-icon-btn" aria-label={`Delete ${entry.name}`} disabled={busy} onClick={() => setPendingDelete(entry)}>×</button>
                        </div>
                      </div>
                    </div>
                    {isEditing ? (
                      <>
                        <DataPointEditor
                          points={entry.dataPoints?.length ? entry.dataPoints : defaultDraftPoints(pointOptions).map((row) => (
                            row.field === "client_name" || fieldKey(row.label) === "client_name"
                              ? { ...row, value: entry.name }
                              : row
                          ))}
                          options={pointOptions}
                          busy={busy}
                          onChange={(updater) => patchItem(entry.id, { dataPoints: updater(entry.dataPoints || []) })}
                        />
                        <textarea
                          className="ua-cfg-tf-story"
                          rows={3}
                          value={asCopyString(entry.description)}
                          disabled={busy}
                          onChange={(event) => patchItem(entry.id, { description: event.target.value })}
                        />
                      </>
                    ) : (
                      <>
                        {asCopyString(entry.description) ? <p className="ua-cfg-tf-item__story">{asCopyString(entry.description)}</p> : null}
                        {points.length ? (
                          <div className="ua-cfg-tf-chips">
                            {points.map((row) => (
                              <span key={row.id || row.field} className="ua-cfg-tf-chip">
                                <span className="ua-cfg-tf-chip__label">{asCopyString(row.label)}</span>
                                <span className="ua-cfg-tf-chip__value">{asCopyString(row.value)}</span>
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">
            {loading ? "Fetching transformations…" : query ? "No transformations match your search." : "No transformations yet."}
          </p>
        )}

        <ListPagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          pageSize={TESTIMONIAL_PAGE_SIZE}
          onPageChange={setPage}
          label="Transformation pagination"
        />
      </Panel>

      <TransformationViewModal
        entry={viewing}
        onClose={() => setViewingId(null)}
        onEdit={(id) => {
          setCreating(false);
          setEditingId(id);
        }}
      />

      <ImageCropModal
        open={Boolean(cropPending)}
        label="transformation photo"
        file={cropPending?.file}
        previewUrl={cropPending?.previewUrl || ""}
        busy={busy}
        defaultRatio={TF_CROP_RATIO}
        originalAspectCss={`${TF_CROP_WIDTH} / ${TF_CROP_HEIGHT}`}
        originalAspectNumber={TF_CROP_WIDTH / TF_CROP_HEIGHT}
        cropWidth={TF_CROP_WIDTH}
        cropHeight={TF_CROP_HEIGHT}
        backdropClassName="ua-cfg-tf-crop-modal"
        onClose={closeCrop}
        onConfirm={confirmCrop}
      />
      {mediaPickerModal}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag="Transformation"
        title={`Delete ${asCopyString(pendingDelete?.name) || "this transformation"}?`}
        body="This permanently removes the story and its before / after photos."
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={deleteItem}
      />
    </div>
  );
}
