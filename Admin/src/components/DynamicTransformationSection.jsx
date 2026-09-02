import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminCreateTransformation,
  adminDeleteTransformation,
  adminListTransformations,
  adminUpdateTransformation,
} from "../api/transformationApi.js";
import { adminGetConfigDropdown, adminListConfigDropdowns } from "../api/configDropdownApi.js";
import {
  adminDeleteMediaAsset,
  adminListMediaAssets,
  adminUpdateMediaAsset,
  attachMediaAsset,
  downloadMediaAsset,
  galleryOwnersFromAssets,
} from "../api/mediaAssetApi.js";
import {
  TESTIMONIAL_POINT_SLUG,
  defaultDraftPoints,
  fieldKey,
  mapTestimonialPointOptions,
  pointsToTransformationFields,
} from "../data/testimonialDropdownData.js";
import { TRANSFORMATION_MEDIA_CATEGORY, TRANSFORMATION_PAGE_SIZE } from "../data/transformationConfigData.js";
import { formatRecipeDate } from "../data/recipesConfigData.js";
import { asCopyString } from "../data/bannerConfigData.js";
import { galleryVersionLabel } from "../data/galleryData.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";
import { MediaPickerModal } from "./MediaPickerModal.jsx";
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

const TF_CROP_WIDTH = 400;
const TF_CROP_HEIGHT = 500;
const TF_CROP_RATIO = "4:5";

const GALLERY_TRASH_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

function galleryAssetTime(entry) {
  const raw = entry?.createdAt || entry?.updatedAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function isGalleryEntryLive(entry, items = []) {
  if (!entry) return false;
  const on = (value) =>
    value === true || value === 1 || value === "true" || value === "on" || value === "active";
  if (on(entry.live) || String(entry.status || "").toLowerCase() === "active") return true;
  if (entry.source === "transformation" && entry.itemId) {
    const item = items.find((row) => row.id === entry.itemId);
    if (!item) return on(entry.live);
    if (item.status === "inactive" || item.live === false) return false;
    return on(item.live) || item.status !== "inactive";
  }
  return false;
}

function inGalleryDateRange(entry, fromDate, toDate) {
  if (!fromDate && !toDate) return true;
  const time = galleryAssetTime(entry);
  if (time == null) return true;
  if (fromDate) {
    const from = new Date(`${fromDate}T00:00:00`).getTime();
    if (!Number.isNaN(from) && time < from) return false;
  }
  if (toDate) {
    const to = new Date(`${toDate}T23:59:59.999`).getTime();
    if (!Number.isNaN(to) && time > to) return false;
  }
  return true;
}

function galleryDeleteCopy(pending) {
  if (!pending?.ids?.length) {
    return { title: "Delete this image?", body: "This removes the image from the transformation gallery." };
  }
  if (pending.ids.length === 1) {
    const name = pending.title ? `“${pending.title}”` : `this ${pending.kind || "image"}`;
    return {
      title: `Delete ${name}?`,
      body: pending.kind === "transformation"
        ? "This permanently removes the unmarked transformation and its photos."
        : "This removes the image from the gallery. Live transformations are not changed.",
    };
  }
  return {
    title: `Delete ${pending.ids.length} selected items?`,
    body: "This permanently removes unmarked selected items. Live assets are not deleted.",
  };
}

function Panel({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
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
  const points = (entry.dataPoints || []).filter((row) => {
    if (!String(row.value || "").trim()) return false;
    const key = fieldKey(row.field) || fieldKey(row.label);
    return key !== "client_name" && key !== "name";
  });
  const story = asCopyString(entry.description);
  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-rc-view ua-cfg-rc-view--sheet ua-cfg-tf-view" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="tf-view-title">
        <div className="ua-cfg-rc-view__head">
          <h3 id="tf-view-title">{asCopyString(entry.name) || "Untitled client"}</h3>
          <button type="button" className="ua-cfg-tf-view__close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-tf-view__body">
          <div className="ua-cfg-tf-view__compare">
            <div className="ua-cfg-tf-view__shot ua-cfg-tf-view__shot--before">
              {entry.oldImage ? <img src={entry.oldImage} alt={`${entry.name} before`} /> : <div className="ua-cfg-tf-view__empty">No before photo</div>}
              <span>Before</span>
            </div>
            <div className="ua-cfg-tf-view__shot ua-cfg-tf-view__shot--after">
              {entry.newImage ? <img src={entry.newImage} alt={`${entry.name} after`} /> : <div className="ua-cfg-tf-view__empty">No after photo</div>}
              <span>After</span>
            </div>
          </div>
          {points.length ? (
            <dl className="ua-cfg-tf-chips">
              {points.map((row) => (
                <div key={row.id || row.field} className="ua-cfg-tf-chip">
                  <dt>{asCopyString(row.label) || row.field}</dt>
                  <dd>{asCopyString(row.value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {story ? <p className="ua-cfg-rc-view__copy">{story}</p> : null}
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
  const [pagination, setPagination] = useState({ page: 1, limit: TRANSFORMATION_PAGE_SIZE, total: 0, pages: 1 });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [cropPending, setCropPending] = useState(null);
  const [pointOptions, setPointOptions] = useState([]);
  const [galleryQuery, setGalleryQuery] = useState("");
  const [galleryOwner, setGalleryOwner] = useState("All owners");
  const [galleryFromDate, setGalleryFromDate] = useState("");
  const [galleryToDate, setGalleryToDate] = useState("");
  const [gallerySelected, setGallerySelected] = useState([]);
  const [galleryMedia, setGalleryMedia] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [galleryBusyId, setGalleryBusyId] = useState("");
  const [pendingMediaDelete, setPendingMediaDelete] = useState(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

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
        limit: TRANSFORMATION_PAGE_SIZE,
        search: query || undefined,
      });
      const next = result.items || [];
      setItems(next);
      setPagination({
        page: Number(result.pagination?.page) || nextPage,
        limit: Number(result.pagination?.limit) || TRANSFORMATION_PAGE_SIZE,
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

  const loadGallery = useCallback(async () => {
    setGalleryLoading(true);
    try {
      const result = await adminListMediaAssets(null, {
        page: 1,
        limit: 200,
        type: "image",
        category: TRANSFORMATION_MEDIA_CATEGORY,
        search: galleryQuery.trim() || undefined,
        owner: galleryOwner === "All owners" ? undefined : galleryOwner,
        from: galleryFromDate || undefined,
        to: galleryToDate || undefined,
      });
      setGalleryMedia(Array.isArray(result?.items) ? result.items : []);
    } catch (error) {
      setGalleryMedia([]);
      onToast(error?.message || "Could not load transformation gallery");
    } finally {
      setGalleryLoading(false);
    }
  }, [galleryFromDate, galleryOwner, galleryQuery, galleryToDate, onToast]);

  useEffect(() => {
    const timer = setTimeout(loadGallery, 200);
    return () => clearTimeout(timer);
  }, [loadGallery]);

  useEffect(() => {
    setGallerySelected([]);
  }, [galleryFromDate, galleryOwner, galleryQuery, galleryToDate]);

  async function useGalleryImage(asset) {
    if (!asset?.url || busy) return;
    const slot = asset.slot === "new" || asset.kind === "After"
      ? "new"
      : asset.slot === "old" || asset.kind === "Before"
        ? "old"
        : creating && draft.oldPreview
          ? "new"
          : editingId && items.find((row) => row.id === editingId)?.oldImage
            ? "new"
            : "old";
    setBusy(true);
    try {
      const file = await attachMediaAsset(asset);
      if (creating) {
        openCrop(file, slot === "new" ? "draft-new" : "draft-old");
      } else if (editingId) {
        openCrop(file, `${editingId}:${slot}`);
      } else {
        setCreating(true);
        setEditingId(null);
        setViewingId(null);
        openCrop(file, slot === "new" ? "draft-new" : "draft-old");
      }
    } catch (error) {
      onToast(error?.message || "Could not use gallery image");
    } finally {
      setBusy(false);
    }
  }

  function toggleGallerySelect(id) {
    setGallerySelected((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]));
  }

  async function toggleGalleryLive(entry) {
    if (!entry?.id) return;
    setGalleryBusyId(entry.id);
    try {
      if (entry.source === "library") {
        const updated = await adminUpdateMediaAsset(null, entry.id, { live: !entry.live });
        setGalleryMedia((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        onToast(updated.live ? "Marked live in gallery" : "Unmarked in gallery");
        return;
      }
      const item = itemsRef.current.find((row) => row.id === entry.itemId);
      if (!item) return;
      await toggleLive(item);
    } catch (error) {
      onToast(error?.message || "Could not update gallery asset");
    } finally {
      setGalleryBusyId("");
    }
  }

  async function downloadGalleryAsset(entry, filename) {
    if (!entry?.url) {
      onToast("No file available to download");
      return;
    }
    setGalleryBusyId(entry.id);
    try {
      await downloadMediaAsset(entry, filename || entry.title);
      onToast("Download started");
    } catch (error) {
      onToast(error?.message || "Failed to download file");
    } finally {
      setGalleryBusyId("");
    }
  }

  function requestDeleteGalleryItem(entry) {
    if (!entry) return;
    if (isGalleryEntryLive(entry, itemsRef.current)) {
      onToast("Unmark live assets before delete");
      return;
    }
    setPendingMediaDelete({
      ids: [entry.id],
      title: entry.title,
      kind: entry.source === "transformation" ? "transformation" : "image",
    });
  }

  function requestDeleteGallerySelected(entries) {
    const ids = gallerySelected.filter((id) => {
      const entry = entries.find((item) => item.id === id);
      return entry && !isGalleryEntryLive(entry, itemsRef.current);
    });
    if (!ids.length) {
      onToast("Unmark live assets before delete");
      return;
    }
    setPendingMediaDelete({ ids, title: null, kind: "item" });
  }

  async function downloadGallerySelected(entries) {
    const selected = gallerySelected
      .map((id) => entries.find((item) => item.id === id))
      .filter((entry) => entry?.url);
    if (!selected.length) {
      onToast("No file available to download");
      return;
    }
    setGalleryBusyId("bulk-download");
    try {
      for (const entry of selected) {
        await downloadMediaAsset(entry, entry.title);
      }
      onToast(selected.length === 1 ? "Download started" : `Downloading ${selected.length} files`);
    } catch (error) {
      onToast(error?.message || "Failed to download files");
    } finally {
      setGalleryBusyId("");
    }
  }

  async function confirmMediaDelete() {
    const ids = pendingMediaDelete?.ids || [];
    if (!ids.length) {
      setPendingMediaDelete(null);
      return;
    }
    const single = ids.length === 1;
    const libraryIds = [];
    const transformationIds = new Set();
    for (const id of ids) {
      const fromGallery = filteredGallery.find((row) => row.id === id)
        || galleryMedia.find((row) => row.id === id);
      if (isGalleryEntryLive(fromGallery, itemsRef.current)) continue;
      const library = galleryMedia.find((row) => row.id === id);
      if (library) {
        libraryIds.push(id);
        continue;
      }
      const match = String(id).match(/^tf-(.+)-(old|new)$/);
      if (match) {
        const item = itemsRef.current.find((row) => row.id === match[1]);
        if (item && isGalleryEntryLive({ source: "transformation", itemId: item.id, live: item.live }, itemsRef.current)) {
          continue;
        }
        transformationIds.add(match[1]);
      }
    }
    if (!libraryIds.length && !transformationIds.size) {
      onToast("Unmark live assets before delete");
      return;
    }
    setPendingMediaDelete(null);
    if (single) setGalleryBusyId(ids[0]);
    try {
      for (const id of libraryIds) {
        await adminDeleteMediaAsset(null, id);
      }
      for (const id of transformationIds) {
        await adminDeleteTransformation(null, id);
      }
      setGalleryMedia((prev) => prev.filter((row) => !libraryIds.includes(row.id)));
      setGallerySelected([]);
      if (transformationIds.size) await loadItems();
      await loadGallery();
      onToast(single ? "Removed from transformation gallery" : "Deleted selected items");
    } catch (error) {
      onToast(error?.message || (single ? "Could not delete gallery asset" : "Could not delete some assets"));
      await loadGallery();
      if (transformationIds.size) await loadItems();
    } finally {
      setGalleryBusyId("");
    }
  }

  const liveCount = useMemo(() => items.filter((row) => row.live).length, [items]);
  const viewing = items.find((row) => row.id === viewingId) || null;

  const galleryFromItems = useMemo(() => {
    const rows = [];
    const seen = new Set();
    for (const entry of items) {
      const title = asCopyString(entry.name) || "Untitled client";
      const stamp = entry.updatedAt || entry.createdAt;
      const date = stamp
        ? new Date(stamp).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—";
      const before = String(entry.oldImage || "").trim();
      const after = String(entry.newImage || "").trim();
      if (before && !seen.has(before)) {
        seen.add(before);
        rows.push({
          id: `tf-${entry.id}-old`,
          source: "transformation",
          itemId: entry.id,
          slot: "old",
          kind: "Before",
          title,
          owner: "Transformation",
          date,
          createdAt: stamp,
          size: "",
          versions: 1,
          live: Boolean(entry.live),
          status: entry.status,
          url: before,
          type: "image",
          category: TRANSFORMATION_MEDIA_CATEGORY,
        });
      }
      if (after && !seen.has(after)) {
        seen.add(after);
        rows.push({
          id: `tf-${entry.id}-new`,
          source: "transformation",
          itemId: entry.id,
          slot: "new",
          kind: "After",
          title,
          owner: "Transformation",
          date,
          createdAt: stamp,
          size: "",
          versions: 1,
          live: Boolean(entry.live),
          status: entry.status,
          url: after,
          type: "image",
          category: TRANSFORMATION_MEDIA_CATEGORY,
        });
      }
    }
    return rows;
  }, [items]);

  const galleryFromLibrary = useMemo(
    () =>
      galleryMedia.map((entry) => ({
        ...entry,
        source: "library",
        kind: "Library",
        slot: "old",
      })),
    [galleryMedia],
  );

  const allGallery = useMemo(() => {
    const map = new Map();
    for (const entry of [...galleryFromLibrary, ...galleryFromItems]) {
      const key = entry.url || entry.id;
      if (!key || map.has(key)) continue;
      map.set(key, entry);
    }
    return Array.from(map.values());
  }, [galleryFromItems, galleryFromLibrary]);

  const filteredGallery = useMemo(() => {
    let rows = allGallery;
    const q = galleryQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter((entry) =>
        [entry.title, entry.owner, entry.kind, entry.category]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    if (galleryOwner !== "All owners") {
      rows = rows.filter((entry) => entry.owner === galleryOwner);
    }
    if (galleryFromDate || galleryToDate) {
      rows = rows.filter((entry) => inGalleryDateRange(entry, galleryFromDate, galleryToDate));
    }
    return rows;
  }, [allGallery, galleryFromDate, galleryOwner, galleryQuery, galleryToDate]);

  const galleryOwners = useMemo(
    () => galleryOwnersFromAssets(allGallery),
    [allGallery],
  );
  const gallerySelectedHasLive = gallerySelected.some((id) =>
    isGalleryEntryLive(filteredGallery.find((entry) => entry.id === id), items),
  );
  const galleryDeleteMessage = galleryDeleteCopy(pendingMediaDelete);

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
              <strong><span aria-hidden="true"></span> New transformation <span className="ua-cfg-panel__sub">(Aspect ratio of image should be 4:5. Ex:400x500, 600x750)</span> </strong>
              <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={() => setCreating(false)}>×</button>
            </div>
            <div className="ua-cfg-rc-new__grid ua-cfg-tf-new__grid">
              <div className="ua-cfg-tf-new__top">
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
                <div className="ua-cfg-tf-new__content">
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
          pageSize={TRANSFORMATION_PAGE_SIZE}
          onPageChange={setPage}
          label="Transformation pagination"
        />
      </Panel>

      <Panel
        className="ua-cfg-tf-gallery ua-cfg-gl"
        title="Gallery"
        subtitle="Assets uploaded for this section — filter by owner or date, reuse, download or delete. Live assets must be unmarked first."
        actions={(
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
            disabled={busy}
            onClick={() => setGalleryPickerOpen(true)}
          >
            + Upload media
          </button>
        )}
      >
        <div className="ua-cfg-mv-gallery__filters">
          <input
            type="search"
            className="ua-cfg-mv-gallery__search"
            placeholder="Search media by name"
            value={galleryQuery}
            onChange={(event) => setGalleryQuery(event.target.value)}
          />
          <select
            className="ua-cfg-mv-gallery__select"
            value={galleryOwner}
            onChange={(event) => setGalleryOwner(event.target.value)}
          >
            {galleryOwners.map((entry) => (
              <option key={entry} value={entry}>{entry}</option>
            ))}
          </select>
          <input
            type="date"
            className="ua-cfg-mv-gallery__date"
            aria-label="From date"
            value={galleryFromDate}
            onChange={(event) => setGalleryFromDate(event.target.value)}
          />
          <input
            type="date"
            className="ua-cfg-mv-gallery__date"
            aria-label="To date"
            value={galleryToDate}
            onChange={(event) => setGalleryToDate(event.target.value)}
          />
          <span className="ua-cfg-tf-gallery__count">
            {galleryLoading && !allGallery.length
              ? "Loading…"
              : allGallery.length
                ? `${filteredGallery.length} of ${allGallery.length} items`
                : "No items"}
          </span>
        </div>
        {gallerySelected.length ? (
          <div className="ua-cfg-mv-gallery__bar">
            <div className="ua-cfg-mv-gallery__selection">
              <span>{gallerySelected.length} selected</span>
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
                disabled={galleryBusyId === "bulk-download"}
                onClick={() => downloadGallerySelected(filteredGallery)}
              >
                Download
              </button>
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--danger ua-cfg-btn--sm"
                disabled={gallerySelectedHasLive}
                title={gallerySelectedHasLive ? "Unmark live assets before delete" : undefined}
                onClick={() => requestDeleteGallerySelected(filteredGallery)}
              >
                Delete
              </button>
              <button
                type="button"
                className="ua-cfg-icon-btn"
                aria-label="Clear selection"
                onClick={() => setGallerySelected([])}
              >
                ×
              </button>
            </div>
          </div>
        ) : null}
        <div className={`ua-cfg-mv-gallery__grid${galleryLoading ? " is-loading" : ""}`}>
          {filteredGallery.map((entry) => {
            const isSelected = gallerySelected.includes(entry.id);
            const isLive = isGalleryEntryLive(entry, items);
            const canDelete = !isLive && galleryBusyId !== entry.id;
            return (
              <article key={entry.id} className={`ua-cfg-mv-gallery-card${isSelected ? " is-selected" : ""}`}>
                <div className="ua-cfg-mv-gallery-card__thumb ua-cfg-tf-gallery__thumb">
                  <label className="ua-cfg-mv-gallery-card__check">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleGallerySelect(entry.id)}
                    />
                  </label>
                  <span className="ua-cfg-mv-gallery-card__type ua-cfg-tf-badge">
                    {entry.kind || "Transformation"}
                  </span>
                  {entry.url ? (
                    <img src={entry.url} alt="" />
                  ) : (
                    <span className="ua-cfg-gl-card__placeholder">Transformation image</span>
                  )}
                </div>
                <div className="ua-cfg-mv-gallery-card__body">
                  <strong>{entry.title || "Untitled"}</strong>
                  <span>{entry.owner || "Admin"} · {entry.date || "—"}</span>
                  <span>
                    {entry.source === "library"
                      ? `${entry.size || "—"} · ${galleryVersionLabel(entry.versions)}`
                      : `${entry.kind || "Photo"} · 1 version`}
                  </span>
                </div>
                <div className={`ua-cfg-mv-gallery-card__live${isLive ? " is-live" : ""}`}>
                  <span className={`ua-cfg-mv-gallery-card__status${isLive ? " is-live" : ""}`}>
                    {isLive ? "Live" : "Not live"}
                  </span>
                  <button
                    type="button"
                    className={`ua-toggle ua-toggle--sm${isLive ? " ua-toggle--on" : ""}`}
                    aria-pressed={isLive}
                    disabled={galleryBusyId === entry.id}
                    onClick={() => toggleGalleryLive(entry)}
                  >
                    <span className="ua-toggle__knob" />
                  </button>
                </div>
                <div className="ua-cfg-mv-gallery-card__actions">
                  <button
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                    disabled={busy || !entry.url}
                    onClick={() => useGalleryImage(entry)}
                  >
                    Use
                  </button>
                  <button
                    type="button"
                    className="ua-cfg-icon-btn ua-cfg-gl-card__download"
                    aria-label="Download"
                    disabled={!entry.url || galleryBusyId === entry.id}
                    onClick={() => downloadGalleryAsset(entry)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={`ua-cfg-icon-btn ua-cfg-gl-card__delete${isLive ? " is-locked" : ""}`}
                    aria-label={isLive ? "Unmark live before delete" : "Delete"}
                    title={isLive ? "Unmark live assets before delete" : "Delete"}
                    disabled={!canDelete}
                    aria-disabled={!canDelete}
                    onClick={() => requestDeleteGalleryItem(entry)}
                  >
                    {GALLERY_TRASH_ICON}
                  </button>
                </div>
              </article>
            );
          })}
          {!galleryLoading && !filteredGallery.length ? (
            <p className="ua-cfg-gl-section__empty">
              {galleryQuery || galleryOwner !== "All owners" || galleryFromDate || galleryToDate
                ? "No transformation media match your filters."
                : "No transformation media yet. Upload a photo or use + Upload media."}
            </p>
          ) : null}
        </div>
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

      <MediaPickerModal
        open={galleryPickerOpen}
        onClose={() => setGalleryPickerOpen(false)}
        accept="image"
        multiple
        title="Upload transformation media"
        uploadCategory={TRANSFORMATION_MEDIA_CATEGORY}
        libraryCategory={TRANSFORMATION_MEDIA_CATEGORY}
        cropImages
        cropWidth={TF_CROP_WIDTH}
        cropHeight={TF_CROP_HEIGHT}
        sizeHint={`${TF_CROP_WIDTH}px × ${TF_CROP_HEIGHT}px`}
        onConfirm={(assets) => {
          const ids = assets.map((asset) => asset.id).filter(Boolean);
          setGalleryMedia((prev) => {
            const map = new Map(prev.map((entry) => [entry.id, entry]));
            for (const asset of assets) map.set(asset.id, asset);
            return Array.from(map.values());
          });
          setGallerySelected(ids);
          onToast(`${assets.length} transformation image${assets.length === 1 ? "" : "s"} ready`);
          loadGallery();
        }}
      />

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

      <ConfirmDialog
        open={Boolean(pendingMediaDelete)}
        tag="Transformation gallery"
        title={galleryDeleteMessage.title}
        body={galleryDeleteMessage.body}
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingMediaDelete(null)}
        onConfirm={confirmMediaDelete}
      />
    </div>
  );
}
