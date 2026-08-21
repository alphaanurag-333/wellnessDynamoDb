import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";
import { adminGetConfigDropdown, adminListConfigDropdowns } from "../api/configDropdownApi.js";
import {
  adminCreateYoga,
  adminDeleteYoga,
  adminListYoga,
  adminUpdateYoga,
} from "../api/yogaApi.js";
import {
  emptyRecipeDraft,
  mapDropdownCategoryOptions,
  persistRecipeCategory,
  recipeCategoryLabel,
  resolveCategorySelectValue,
  validateRecipeImage,
  validateRecipeVideo,
  withCategoryLabels,
  youtubeEmbedUrl,
  formatRecipeDate,
} from "../data/recipesConfigData.js";
import { YOGA_CATEGORIES, YOGA_CATEGORY_SLUG, YOGA_PAGE_SIZE } from "../data/yogaConfigData.js";
import { CfgSelect, ListPagination } from "./shared.jsx";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";

const RECIPE_SEARCH_DEBOUNCE_MS = 400;
const CROP_RATIOS = ["Original", "1:1", "4:3", "3:4", "16:9"];
const CROP_ASPECT = {
  Original: [16, 9],
  "1:1": [1, 1],
  "4:3": [4, 3],
  "3:4": [3, 4],
  "16:9": [16, 9],
};

function cropBoxSize(ratio) {
  const [w, h] = CROP_ASPECT[ratio] || CROP_ASPECT.Original;
  const scale = Math.min(280 / w, 280 / h);
  return { width: Math.round(w * scale), height: Math.round(h * scale), w, h };
}

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

function UploadConfirmModal({ open, label, defaultRatio = "Original", onClose, onConfirm }) {
  const [ratio, setRatio] = useState(defaultRatio);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (!open) return undefined;
    setRatio(defaultRatio);
    setZoom(100);
    return undefined;
  }, [open, defaultRatio]);

  if (!open) return null;
  const crop = cropBoxSize(ratio);

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cfg-mv-upload-modal ua-cfg-pt-upload-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="ua-cfg-mv-upload-modal__head">
          <div>
            <h3 className="ua-cfg-mv-upload-modal__title">
              <span aria-hidden="true">✂</span> Confirm upload
            </h3>
            <p className="ua-cfg-mv-upload-modal__sub">{label} · set the crop, ratio and zoom before it is attached</p>
          </div>
          <button type="button" className="ua-cfg-mv-upload-modal__close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-mv-upload-modal__ratios">
          {CROP_RATIOS.map((entry) => (
            <button key={entry} type="button" className={`ua-cfg-mv-upload-modal__ratio${ratio === entry ? " is-active" : ""}`} onClick={() => setRatio(entry)}>
              {entry}
            </button>
          ))}
        </div>
        <div className="ua-cfg-mv-upload-modal__crop">
          <div
            className="ua-cfg-mv-upload-modal__crop-inner ua-cfg-pt-crop"
            style={{ width: crop.width, height: crop.height, transform: `scale(${zoom / 100})` }}
          >
            <span className="ua-cfg-mv-upload-modal__grid" aria-hidden="true" />
          </div>
        </div>
        <div className="ua-cfg-mv-upload-modal__frameworks">
          <span className="ua-cfg-mv-upload-modal__frameworks-label">How it will sit in your frameworks</span>
          <div className="ua-cfg-mv-upload-modal__frameworks-row" style={{ "--fw-ratio": `${crop.w} / ${crop.h}` }}>
            <div className="ua-cfg-mv-upload-modal__framework ua-cfg-mv-upload-modal__framework--web"><span>Web</span><div /></div>
            <div className="ua-cfg-mv-upload-modal__framework ua-cfg-mv-upload-modal__framework--app is-active"><span>App</span><div /></div>
          </div>
        </div>
        <div className="ua-cfg-mv-upload-modal__zoom">
          <button type="button" className="ua-cfg-mv-upload-modal__zoom-btn" onClick={() => setZoom((v) => Math.max(50, v - 10))}>−</button>
          <input type="range" min={50} max={150} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          <button type="button" className="ua-cfg-mv-upload-modal__zoom-btn" onClick={() => setZoom((v) => Math.min(150, v + 10))}>+</button>
          <span className="ua-cfg-mv-upload-modal__zoom-value">{zoom}%</span>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => { setRatio(defaultRatio); setZoom(100); }}>Reset</button>
        </div>
        <div className="ua-cfg-mv-upload-modal__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>Discard</button>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={onConfirm}>Confirm &amp; attach</button>
        </div>
      </div>
    </div>
  );
}

function LinkModal({ open, title, initialUrl = "", onClose, onSave }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(open ? asCopyString(initialUrl) : "");
  }, [initialUrl, open]);

  if (!open) return null;

  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-mv-link-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="ua-cfg-mv-link-modal__head">
          <div>
            <h3 className="ua-cfg-mv-link-modal__title">
              <span aria-hidden="true">🔗</span> Use a link
            </h3>
            <p className="ua-cfg-mv-link-modal__sub">{title} · replaces the uploaded video</p>
          </div>
          <button type="button" className="ua-cfg-mv-link-modal__close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <input
          type="url"
          className="ua-cfg-mv-link-modal__input"
          placeholder="youtube.com/watch?v=… or vimeo.com/…"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <div className="ua-cfg-mv-link-modal__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary"
            onClick={() => {
              onSave(asCopyString(url).trim());
              setUrl("");
            }}
          >
            Save link
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryModal({ entry, onClose, onToast }) {
  if (!entry) return null;
  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-rc-history" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="ua-cfg-rc-history__head">
          <div>
            <h3>{asCopyString(entry.title)}</h3>
            <p>Video · owned by {asCopyString(entry.owner)} · newest first</p>
          </div>
          <button type="button" className="ua-cfg-mv-upload-modal__close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-rc-history__row">
          <span>CURRENT</span>
          <div>
            <strong>Live version</strong>
            <p>Uploaded by {asCopyString(entry.owner)} · {asCopyString(entry.date)} · {asCopyString(entry.size)}</p>
          </div>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => onToast("Download started")}>Download</button>
        </div>
      </div>
    </div>
  );
}

function CategorySelect({ options, value, disabled, onChange, className = "", ariaLabel = "Category", placeholder = "Choose category" }) {
  const selected = resolveCategorySelectValue(value, options);
  const known = options.some((entry) => entry.value === selected);
  const selectOptions = [
    ...(!options.length ? [{ value: "", label: "No categories" }] : []),
    ...(!known && value ? [{ value, label: recipeCategoryLabel(value, options) }] : []),
    ...options,
  ];
  return (
    <CfgSelect
      className={`ua-cfg-rc-select${className ? ` ${className}` : ""}`}
      options={selectOptions}
      value={known ? selected : value || ""}
      disabled={disabled || !options.length}
      onChange={onChange}
      ariaLabel={ariaLabel}
      placeholder={placeholder}
    />
  );
}

function SpecsEditor({ value, disabled, onChange }) {
  const incoming = Array.isArray(value) ? value.map((row) => String(row || "")) : [];
  const incomingKey = incoming.join("\n");
  const [rows, setRows] = useState(() => (incoming.length ? incoming : [""]));
  const syncedKey = useRef(incomingKey);

  useEffect(() => {
    if (incomingKey === syncedKey.current) return;
    syncedKey.current = incomingKey;
    setRows(incomingKey ? incomingKey.split("\n") : [""]);
  }, [incomingKey]);

  function emit(nextRows) {
    const normalized = nextRows.length ? nextRows : [""];
    setRows(normalized);
    const cleaned = normalized.map((row) => String(row || "").trim()).filter(Boolean);
    syncedKey.current = cleaned.join("\n");
    onChange(cleaned);
  }

  function addBullet() {
    emit([...rows, ""]);
  }

  return (
    <div className="ua-cfg-rc-specs-editor">
      {rows.map((row, index) => (
        <div className="ua-cfg-rc-specs-editor__row" key={`spec-${index}`}>
          <span className="ua-cfg-rc-specs-editor__bullet" aria-hidden="true">•</span>
          <input
            className="ua-cfg-vh-input"
            value={row}
            disabled={disabled}
            placeholder={index === 0 ? "e.g. 50 g Protein" : "Add another spec"}
            onChange={(event) => emit(rows.map((entry, i) => (i === index ? event.target.value : entry)))}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              addBullet();
            }}
          />
          {rows.length > 1 || String(row).trim() ? (
            <button
              type="button"
              className="ua-cfg-icon-btn"
              aria-label="Remove spec"
              disabled={disabled}
              onClick={() => emit(rows.filter((_, i) => i !== index))}
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
        disabled={disabled}
        onClick={addBullet}
      >
        + Add bullet
      </button>
    </div>
  );
}

function SpecChips({ specs }) {
  const items = Array.isArray(specs) ? specs.filter(Boolean) : [];
  if (!items.length) return null;
  return (
    <div className="ua-cfg-rc-specs">
      {items.map((spec) => (
        <span key={spec} className="ua-cfg-rc-spec">{spec}</span>
      ))}
    </div>
  );
}

function RecipeViewModal({ entry, onClose, onEdit, viewTag = "Yoga & Pranayam", itemNoun = "Practice", showSpecs = false }) {
  if (!entry) return null;
  const embed = youtubeEmbedUrl(entry.videoLink);
  const isVideo = entry.apiType === "video" || entry.type === "VIDEO";
  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-rc-view ua-cfg-rc-view--sheet ua-cfg-recipes-view" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="recipe-view-title">
        <div className="ua-cfg-rc-view__head">
          <div>
            <p className="ua-cfg-rc-view__tag">{viewTag}</p>
            <h3 id="recipe-view-title">{asCopyString(entry.title) || `Untitled ${itemNoun.toLowerCase()}`}</h3>
            <p>{asCopyString(entry.categoryLabel || entry.category) || "Uncategorized"} · {entry.live ? "Live" : "Hidden"}</p>
          </div>
          <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-rc-view__body">
        <div className="ua-cfg-rc-view__media">
          {entry.thumbnail ? <img src={entry.thumbnail} alt="" /> : <div className="ua-cfg-rc-view__media-empty">No cover</div>}
        </div>
        {asCopyString(entry.description) ? <p className="ua-cfg-rc-view__copy">{asCopyString(entry.description)}</p> : null}
        {showSpecs ? <SpecChips specs={entry.videoSpecification} /> : null}
        <dl className="ua-cfg-rc-view__meta">
          <div>
            <dt>Type</dt>
            <dd>{isVideo ? "Uploaded video" : "YouTube link"}</dd>
          </div>
          <div>
            <dt>{isVideo ? "Video" : "YouTube"}</dt>
            <dd>
              {isVideo && entry.video ? (
                <a href={entry.video} target="_blank" rel="noreferrer">{entry.video}</a>
              ) : entry.videoLink ? (
                <a href={entry.videoLink} target="_blank" rel="noreferrer">{entry.videoLink}</a>
              ) : "—"}
            </dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatRecipeDate(entry.createdAt)}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatRecipeDate(entry.updatedAt)}</dd>
          </div>
        </dl>
        {embed ? (
          <div className="ua-cfg-rc-view__embed">
            <iframe title={asCopyString(entry.title) || `${itemNoun} video`} src={embed} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        ) : isVideo && entry.video ? (
          <video className="ua-cfg-rc-view__player" src={entry.video} controls preload="metadata" />
        ) : null}
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
            Edit {itemNoun.toLowerCase()}
          </button>
        </div>
      </div>
    </div>
  );
}

function CoverDrop({ previewUrl, disabled, label = "Cover photo", onPick, onRemove }) {
  const inputRef = useRef(null);
  const filled = Boolean(previewUrl);

  return (
    <div className={`ua-cfg-tf-drop ua-cfg-tf-drop--before ua-cfg-rc-dropbox${filled ? " is-on" : ""}`}>
      {filled ? <img className="ua-cfg-tf-drop__img" src={previewUrl} alt="" /> : null}
      <span className="ua-cfg-tf-drop__icon" aria-hidden="true">🖼</span>
      <p className="ua-cfg-tf-drop__label">{label}</p>
      <button
        type="button"
        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-tf-drop__btn"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {filled ? "Replace photo" : "Upload photo"}
      </button>
      {filled && onRemove ? (
        <button type="button" className="ua-cfg-rc-media-x" aria-label="Remove cover" disabled={disabled} onClick={onRemove}>×</button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
    </div>
  );
}

function FileButton({ accept, disabled, label, onPick }) {
  const inputRef = useRef(null);
  return (
    <>
      <button
        type="button"
        className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm ua-cfg-rc-file-btn"
        disabled={disabled}
        title={label}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
    </>
  );
}

function revokeBlobUrl(url) {
  if (url && String(url).startsWith("blob:")) URL.revokeObjectURL(url);
}

function VideoDrop({ previewUrl, embedUrl, fileName, disabled, onPick, onRemove }) {
  const inputRef = useRef(null);
  const filled = Boolean(previewUrl || embedUrl || fileName);

  return (
    <div className={`ua-cfg-tf-drop ua-cfg-tf-drop--after ua-cfg-rc-dropbox${filled ? " is-on" : ""}`}>
      {previewUrl ? (
        <video className="ua-cfg-tf-drop__img ua-cfg-rc-video-preview" src={previewUrl} controls preload="metadata" />
      ) : embedUrl ? (
        <iframe
          className="ua-cfg-tf-drop__img ua-cfg-rc-video-preview"
          title="YouTube preview"
          src={embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : null}
      <span className="ua-cfg-tf-drop__icon" aria-hidden="true">▶</span>
      <p className="ua-cfg-tf-drop__label">{fileName || "Video file"}</p>
      <button
        type="button"
        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-tf-drop__btn"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {previewUrl ? "Replace video" : "Upload video"}
      </button>
      {filled && onRemove ? (
        <button type="button" className="ua-cfg-rc-media-x" aria-label="Remove video" disabled={disabled} onClick={onRemove}>×</button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogg,.mov,.m4v"
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
    </div>
  );
}

const YOGA_COPY = {
  categorySlug: YOGA_CATEGORY_SLUG,
  pageSize: YOGA_PAGE_SIZE,
  loading: "Loading yoga…",
  subtitle: "Yoga sessions from the catalog. Cover photo plus a YouTube link or video file.",
  search: "Search yoga by title or description…",
  fetching: "Fetching yoga…",
  none: "No yoga sessions yet.",
  noneMatch: "No yoga sessions match your search.",
  noun: "practice",
  nouns: "practices",
  viewTag: "Yoga & Pranayam",
  cropLabel: "yoga cover",
  deleteBody: "This removes it from the yoga catalog.",
  dropdownHint: "Add yoga categories in Configs → Dropdowns first.",
  categoryRequired: "Choose a yoga category",
  failLoad: "Failed to load yoga",
  failAdd: "Failed to add yoga",
  failSave: "Failed to save yoga",
  failDelete: "Failed to delete yoga",
  failCats: "Failed to load yoga categories",
  pagination: "Yoga pagination",
};

export function YogaSection({
  editor,
  setEditor,
  items,
  setItems,
  onToast,
  categories = YOGA_CATEGORIES,
  titlePlaceholder = "Title · e.g. Morning vinyasa flow",
  descriptionPlaceholder = "Yoga sequence description shown in the app...",
  itemNoun = "Practice",
}) {
  const persist = true;
  const copy = YOGA_COPY;
  const showSpecs = false;
  const pageSize = YOGA_PAGE_SIZE;
  const showGallery = false;
  const gallery = [];
  const setGallery = () => {};
  const galleryOwners = [];
  const galleryBadge = "Yoga";
  const galleryPlaceholder = "Yoga media";
  const videoCropLabel = "libvideo";
  const coverCropLabel = "libcover";
  const galleryCropLabel = "yoga";
  const coverCropRatio = "16:9";
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [upload, setUpload] = useState(null);
  const [linkFor, setLinkFor] = useState(null);
  const [categoryOptions, setCategoryOptions] = useState(
    persist ? [] : (categories || []).map((entry) => ({ value: entry, label: entry })),
  );
  const [draft, setDraft] = useState(emptyRecipeDraft(persist ? "" : (categories[0] || "")));
  const [search, setSearch] = useState("");
  const [listQuery, setListQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [owner, setOwner] = useState("All owners");
  const [selected, setSelected] = useState([]);
  const [history, setHistory] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(persist);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [cropPending, setCropPending] = useState(null);
  const itemsRef = useRef(items);
  const categoryOptionsRef = useRef(categoryOptions);
  const coverInputRefs = useRef({});
  const loadSeq = useRef(0);
  const filtersKey = `${debouncedQuery}|${categoryFilter}`;
  const filtersKeyRef = useRef(filtersKey);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    categoryOptionsRef.current = categoryOptions;
  }, [categoryOptions]);

  useEffect(() => () => {
    if (draft.coverPreview.startsWith("blob:")) URL.revokeObjectURL(draft.coverPreview);
  }, [draft.coverPreview]);

  useEffect(() => () => {
    revokeBlobUrl(draft.videoPreview);
  }, [draft.videoPreview]);

  useEffect(() => () => {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
  }, [cropPending?.previewUrl]);

  const loadCategories = useCallback(async () => {
    if (!persist) return;
    const slug = copy.categorySlug;
    try {
      let list = null;
      try {
        list = await adminGetConfigDropdown(null, slug);
      } catch {
        const { lists } = await adminListConfigDropdowns(null, { limit: 50 });
        list = (lists || []).find((row) => row.slug === slug) || null;
      }
      const options = mapDropdownCategoryOptions(list);
      setCategoryOptions(options);
      setDraft((prev) => ({
        ...prev,
        category: prev.category || options[0]?.value || "",
      }));
    } catch (error) {
      onToast(error?.message || copy?.failCats || "Failed to load categories");
      setCategoryOptions([]);
    }
  }, [copy, onToast, persist]);

  const loadItems = useCallback(async (pageOverride) => {
    if (!persist) return;
    const nextPage = pageOverride ?? page;
    const seq = ++loadSeq.current;
    const categoryValue = categoryFilter
      ? persistRecipeCategory(categoryFilter, categoryOptionsRef.current) || categoryFilter
      : "";
    setLoading(true);
    try {
      const { items: rows, pagination: nextPagination } = await adminListYoga(null, {
        page: nextPage,
        limit: pageSize,
        search: debouncedQuery || undefined,
        category: categoryValue || undefined,
      });
      if (seq !== loadSeq.current) return;
      const next = withCategoryLabels(rows || [], categoryOptionsRef.current);
      setItems(next);
      itemsRef.current = next;
      setPagination({
        page: Number(nextPagination?.page) || nextPage,
        limit: Number(nextPagination?.limit) || pageSize,
        total: Number(nextPagination?.total) || next.length,
        pages: Number(nextPagination?.pages) || 1,
      });
    } catch (error) {
      if (seq !== loadSeq.current) return;
      onToast(error?.message || copy?.failLoad || "Failed to load items");
      setItems([]);
      itemsRef.current = [];
      setPagination({ page: 1, limit: pageSize, total: 0, pages: 1 });
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [categoryFilter, copy, debouncedQuery, onToast, page, pageSize, persist, setItems]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!persist) return undefined;
    const timer = window.setTimeout(() => {
      setDebouncedQuery(listQuery.trim());
    }, RECIPE_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [listQuery, persist]);

  useEffect(() => {
    if (!persist) return undefined;
    if (filtersKeyRef.current !== filtersKey) {
      filtersKeyRef.current = filtersKey;
      if (page !== 1) {
        setPage(1);
        return undefined;
      }
    }
    loadItems();
    return undefined;
  }, [filtersKey, loadItems, page, persist]);

  useEffect(() => {
    if (!persist || loading) return undefined;
    if (page > pagination.pages) setPage(pagination.pages);
    return undefined;
  }, [loading, page, pagination.pages, persist]);

  useEffect(() => {
    if (!persist) return undefined;
    setItems((prev) => withCategoryLabels(prev, categoryOptions));
    return undefined;
  }, [categoryOptions, persist, setItems]);

  function patch(next) {
    setEditor((prev) => ({ ...prev, ...next }));
  }

  function updateItem(id, next) {
    setItems((prev) => {
      const copy = prev.map((entry) => (entry.id === id ? { ...entry, ...next } : entry));
      itemsRef.current = copy;
      return copy;
    });
  }

  function moveItem(index, direction) {
    if (persist) return;
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    setItems((prev) => {
      const copy = [...prev];
      const [row] = copy.splice(index, 1);
      copy.splice(next, 0, row);
      return copy;
    });
  }

  function closeCoverCrop() {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending(null);
  }

  function openCoverCrop(file, target) {
    const error = validateRecipeImage(file);
    if (error) {
      onToast(error);
      return;
    }
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending({
      file,
      previewUrl: URL.createObjectURL(file),
      target,
    });
  }

  function pickDraftCover(file) {
    openCoverCrop(file, "draft");
  }

  function pickDraftVideo(file) {
    const error = validateRecipeVideo(file);
    if (error) {
      onToast(error);
      return;
    }
    setDraft((prev) => {
      revokeBlobUrl(prev.videoPreview);
      return {
        ...prev,
        video: true,
        videoFile: file,
        videoName: file.name,
        videoPreview: URL.createObjectURL(file),
        videoLink: "",
      };
    });
  }

  function clearDraftCover() {
    if (draft.coverPreview.startsWith("blob:")) URL.revokeObjectURL(draft.coverPreview);
    setDraft((prev) => ({
      ...prev,
      cover: false,
      coverFile: null,
      coverPreview: "",
    }));
  }

  function clearDraftVideo() {
    setDraft((prev) => {
      revokeBlobUrl(prev.videoPreview);
      return {
        ...prev,
        video: false,
        videoFile: null,
        videoName: "",
        videoPreview: "",
        videoLink: "",
      };
    });
  }

  async function persistItem(id, fields, files, successMessage) {
    setBusy(true);
    try {
      const updated = await adminUpdateYoga(null, id, fields, files);
      if (!updated) throw new Error(copy?.failSave || "Failed to save");
      const labelled = {
        ...updated,
        categoryLabel: recipeCategoryLabel(updated.category, categoryOptions),
      };
      updateItem(id, labelled);
      if (successMessage) onToast(successMessage);
      return labelled;
    } catch (error) {
      onToast(error?.message || copy?.failSave || "Failed to save");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function addItem() {
    const title = asCopyString(draft.title).trim();
    const description = asCopyString(draft.description).trim();
    const category = asCopyString(draft.category).trim();
    if (!title || !description) {
      onToast("Add a title and description");
      return;
    }

    if (persist) {
      const category = persistRecipeCategory(asCopyString(draft.category).trim(), categoryOptions);
      if (!category) {
        onToast(copy?.categoryRequired || "Choose a category");
        return;
      }
      if (!draft.coverFile) {
        onToast("Add a cover photo");
        return;
      }
      const videoLink = asCopyString(draft.videoLink).trim();
      if (!draft.videoFile && !videoLink) {
        onToast("Add a YouTube link or upload a video");
        return;
      }
      setBusy(true);
      try {
        const created = await adminCreateYoga(
          null,
          {
            category,
            title,
            description,
            type: draft.videoFile ? "video" : "ytlink",
            ytLink: draft.videoFile ? "" : videoLink,
            live: true,
          },
          { thumbnailFile: draft.coverFile, videoFile: draft.videoFile },
        );
        if (!created) throw new Error(copy?.failAdd || "Failed to add item");
        if (draft.coverPreview.startsWith("blob:")) URL.revokeObjectURL(draft.coverPreview);
        revokeBlobUrl(draft.videoPreview);
        setDraft(emptyRecipeDraft(categoryOptions[0]?.value || ""));
        setCreating(false);
        onToast(`${itemNoun} added`);
        setPage(1);
        await loadItems(1);
      } catch (error) {
        onToast(error?.message || copy?.failAdd || "Failed to add item");
      } finally {
        setBusy(false);
      }
      return;
    }

    const isVideo = draft.video || Boolean(asCopyString(draft.videoLink).trim());
    setItems((prev) => [
      {
        id: `rc-${Date.now()}`,
        title,
        category: draft.category,
        type: isVideo ? "VIDEO" : "TEXT",
        duration: isVideo ? "0:00" : "4 min read",
        description,
        live: true,
        cover: draft.cover,
        videoLink: asCopyString(draft.videoLink),
      },
      ...prev,
    ]);
    setDraft(emptyRecipeDraft(categories[0] || ""));
    setCreating(false);
    onToast(`${itemNoun} added`);
  }

  async function saveEditedItem(entry) {
    if (!persist) {
      setEditingId(null);
      onToast(`${itemNoun} saved`);
      return;
    }
    const title = asCopyString(entry.title).trim();
    const description = asCopyString(entry.description).trim();
    const category = persist
      ? persistRecipeCategory(asCopyString(entry.category).trim(), categoryOptions)
      : asCopyString(entry.category).trim();
    if (!title || !description) {
      onToast("Add a title and description");
      return;
    }
    if (!category) {
      onToast(copy?.categoryRequired || "Choose a category");
      return;
    }
    const videoLink = asCopyString(entry.videoLink).trim();
    const hasNewVideo = entry.videoFile instanceof File;
    const hasUploadedVideo = hasNewVideo || Boolean(entry.video);
    if (!hasUploadedVideo && !videoLink) {
      onToast("Add a YouTube link or upload a video");
      return;
    }
    const fields = {
      title,
      description,
      category,
      type: hasUploadedVideo && !videoLink ? "video" : "ytlink",
      ytLink: hasUploadedVideo && !videoLink ? "" : videoLink,
      ...(hasUploadedVideo ? {} : { video: "" }),
    };
    const saved = await persistItem(
      entry.id,
      fields,
      hasNewVideo ? { videoFile: entry.videoFile } : {},
      `${itemNoun} saved`,
    );
    if (saved) setEditingId(null);
  }

  async function toggleLive(entry) {
    if (!persist) {
      updateItem(entry.id, { live: !entry.live });
      return;
    }
    if (busy) return;
    const live = !entry.live;
    updateItem(entry.id, { live, status: live ? "active" : "inactive" });
    const saved = await persistItem(entry.id, { live });
    if (!saved) updateItem(entry.id, { live: entry.live, status: entry.status });
  }

  async function toggleSurface(entry, field) {
    if (field !== "webVisible" && field !== "appVisible") return;
    if (!persist) {
      updateItem(entry.id, { [field]: !entry[field] });
      return;
    }
    if (busy) return;
    const next = !entry[field];
    const prev = entry[field];
    updateItem(entry.id, { [field]: next });
    const saved = await persistItem(entry.id, { [field]: next });
    if (!saved) updateItem(entry.id, { [field]: prev });
  }

  async function saveLink(url) {
    if (!url) return;
    if (linkFor === "draft") {
      setDraft((prev) => {
        revokeBlobUrl(prev.videoPreview);
        return {
          ...prev,
          videoLink: url,
          videoFile: null,
          videoName: "",
          videoPreview: "",
          video: false,
        };
      });
      setLinkFor(null);
      onToast("Link saved");
      return;
    }
    if (!persist) {
      updateItem(linkFor, { videoLink: url, type: "VIDEO" });
      setLinkFor(null);
      onToast("Link saved");
      return;
    }
    const saved = await persistItem(linkFor, { type: "ytlink", ytLink: url, video: "" }, {}, "Link saved");
    if (saved) setLinkFor(null);
  }

  async function confirmCoverCrop(croppedFile, cropError) {
    if (cropError) {
      onToast(cropError.message || "Failed to crop image");
      return;
    }
    if (!croppedFile || !cropPending) return;
    const target = cropPending.target;
    closeCoverCrop();
    if (target === "draft") {
      if (draft.coverPreview.startsWith("blob:")) URL.revokeObjectURL(draft.coverPreview);
      setDraft((prev) => ({
        ...prev,
        cover: true,
        coverFile: croppedFile,
        coverPreview: URL.createObjectURL(croppedFile),
      }));
      onToast("Cover attached");
      return;
    }
    await persistItem(target, {}, { thumbnailFile: croppedFile }, "Cover updated");
  }

  function clearItemVideo(id) {
    const current = itemsRef.current.find((row) => row.id === id);
    revokeBlobUrl(current?.videoPreview);
    const hasLink = Boolean(asCopyString(current?.videoLink).trim());
    updateItem(id, {
      video: "",
      videoFile: null,
      videoPreview: "",
      videoName: "",
      type: hasLink ? "YT" : "VIDEO",
      apiType: hasLink ? "ytlink" : "video",
      duration: hasLink ? "YouTube" : "Video",
    });
  }

  async function replaceVideo(id, file) {
    const error = validateRecipeVideo(file);
    if (error) {
      onToast(error);
      return;
    }
    const preview = URL.createObjectURL(file);
    const current = itemsRef.current.find((row) => row.id === id);
    revokeBlobUrl(current?.videoPreview);
    updateItem(id, {
      type: "VIDEO",
      apiType: "video",
      duration: "Video",
      videoFile: file,
      videoPreview: preview,
      videoName: file.name,
      videoLink: "",
    });
    if (!persist) {
      onToast("Video attached");
      return;
    }
    const saved = await persistItem(id, { type: "video", ytLink: "" }, { videoFile: file }, "Video updated");
    if (saved) {
      revokeBlobUrl(preview);
      updateItem(id, { videoPreview: "", videoFile: null, videoName: file.name });
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const entry = pendingDelete;
    setPendingDelete(null);
    if (!persist) {
      setItems((prev) => prev.filter((row) => row.id !== entry.id));
      onToast(`${itemNoun} removed`);
      return;
    }
    setBusy(true);
    try {
      await adminDeleteYoga(null, entry.id);
      onToast(`${itemNoun} removed`);
      const remaining = itemsRef.current.filter((row) => row.id !== entry.id).length;
      if (remaining === 0 && page > 1) {
        const nextPage = page - 1;
        setPage(nextPage);
        await loadItems(nextPage);
      } else {
        await loadItems();
      }
    } catch (error) {
      onToast(error?.message || copy?.failDelete || "Failed to delete item");
    } finally {
      setBusy(false);
    }
  }

  const liveCount = items.filter((entry) => entry.live).length;
  const hasListFilters = Boolean(debouncedQuery || categoryFilter);
  const filtered = useMemo(() => {
    return (gallery || []).filter((entry) => {
      const matchesSearch = asCopyString(entry.title).toLowerCase().includes(search.trim().toLowerCase());
      const matchesOwner = owner === "All owners" || entry.owner === owner;
      return matchesSearch && matchesOwner;
    });
  }, [gallery, owner, search]);
  const selectedLive = selected.some((id) => gallery?.find((entry) => entry.id === id)?.live);
  const linkTitle = linkFor === "draft" ? "New library item" : asCopyString(items.find((entry) => entry.id === linkFor)?.title);
  const linkInitialUrl = linkFor === "draft"
    ? asCopyString(draft.videoLink)
    : asCopyString(items.find((entry) => entry.id === linkFor)?.videoLink);
  const viewingEntry = items.find((entry) => entry.id === viewingId) || null;
  const disabled = busy;
  const listBusy = persist && loading && !items.length;

  function clearListFilters() {
    setListQuery("");
    setDebouncedQuery("");
    setCategoryFilter("");
  }

  return (
    <div className="ua-cfg-rc ua-cfg-recipes">
      {!persist ? (
        <Panel title="Where this is live" subtitle="Turn it on for the app, the website, or both.">
          <div className="ua-cfg-bn-surfaces">
            <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--app${editor.appOn ? " is-on" : ""}`}>
              <span>App {editor.appOn ? "Enabled" : "Disabled"}</span>
              <button type="button" className={`ua-toggle ua-toggle--sm${editor.appOn ? " ua-toggle--on" : ""}`} aria-pressed={editor.appOn} onClick={() => patch({ appOn: !editor.appOn })}>
                <span className="ua-toggle__knob" />
              </button>
            </div>
            <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--web${editor.webOn ? " is-on" : ""}`}>
              <span>Web {editor.webOn ? "Enabled" : "Disabled"}</span>
              <button type="button" className={`ua-toggle ua-toggle--sm${editor.webOn ? " ua-toggle--on" : ""}`} aria-pressed={editor.webOn} onClick={() => patch({ webOn: !editor.webOn })}>
                <span className="ua-toggle__knob" />
              </button>
            </div>
          </div>
        </Panel>
      ) : null}

      <Panel
        title="Yoga & Pranayam"
        subtitle={
          loading
            ? copy?.loading || "Loading…"
            : `${pagination.total || items.length} ${(pagination.total || items.length) === 1 ? copy?.noun : copy?.nouns} · ${liveCount} live on this page${hasListFilters ? " · filtered" : ""}`
        }
        actions={
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-tf-add-btn" disabled={disabled} onClick={() => setCreating(true)}>
            + Add practice
          </button>
        }
      >
        {creating ? (
          <section className="ua-cfg-rc-new ua-cfg-recipes-new">
            <div className="ua-cfg-rc-new__head">
              <strong><span aria-hidden="true">🧘</span> New practice</strong>
              <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={() => setCreating(false)}>×</button>
            </div>
            <div className="ua-cfg-rc-new__grid">
              <div className="ua-cfg-rc-new__media">
                <CoverDrop
                  previewUrl={draft.coverPreview}
                  disabled={disabled}
                  onPick={pickDraftCover}
                  onRemove={clearDraftCover}
                />
                <VideoDrop
                  previewUrl={draft.videoPreview}
                  embedUrl={draft.videoFile ? "" : youtubeEmbedUrl(draft.videoLink)}
                  fileName={draft.videoName}
                  disabled={disabled}
                  onPick={pickDraftVideo}
                  onRemove={clearDraftVideo}
                />
              </div>
              <div className="ua-cfg-rc-new__fields">
                <label className="ua-cfg-rc-field">
                  <span>Category</span>
                  <CategorySelect
                    options={categoryOptions}
                    value={draft.category}
                    disabled={disabled}
                    onChange={(value) => setDraft((prev) => ({ ...prev, category: value }))}
                  />
                </label>
                <label className="ua-cfg-rc-field">
                  <span>Title</span>
                  <input
                    className="ua-cfg-vh-input"
                    placeholder={titlePlaceholder}
                    value={asCopyString(draft.title)}
                    disabled={disabled}
                    onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                  />
                </label>
                {!categoryOptions.length ? (
                  <p className="ua-cfg-panel__sub ua-cfg-rc-new__hint">{copy?.dropdownHint || "Add categories in Configs → Dropdowns first."}</p>
                ) : null}
                <label className="ua-cfg-rc-field ua-cfg-rc-field--wide">
                  <span>Description</span>
                  <textarea
                    className="ua-cfg-tf-story"
                    rows={3}
                    placeholder={descriptionPlaceholder}
                    value={asCopyString(draft.description)}
                    disabled={disabled}
                    onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </label>
                <label className="ua-cfg-rc-field ua-cfg-rc-field--wide">
                  <span>YouTube link</span>
                  <input
                    className="ua-cfg-vh-input"
                    placeholder="https://youtube.com/…"
                    value={asCopyString(draft.videoLink)}
                    disabled={disabled}
                    onChange={(event) => setDraft((prev) => {
                      revokeBlobUrl(prev.videoPreview);
                      return {
                        ...prev,
                        videoLink: event.target.value,
                        videoFile: null,
                        videoName: "",
                        videoPreview: "",
                        video: false,
                      };
                    })}
                  />
                </label>
                <div className="ua-cfg-rc-new__foot">
                  <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={disabled} onClick={addItem}>
                    {busy && creating ? "Saving…" : "Add practice"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <div className="ua-cfg-rc-toolbar">
          <input
            type="search"
            className="ua-cfg-dd-search"
            placeholder={copy?.search || "Search by title or description…"}
            value={listQuery}
            onChange={(event) => setListQuery(event.target.value)}
            aria-label={`Search ${copy?.nouns || "items"}`}
          />
          <CfgSelect
            className="ua-cfg-rc-select ua-cfg-rc-filter"
            options={[{ value: "", label: "All categories" }, ...categoryOptions]}
            value={categoryFilter}
            disabled={disabled}
            onChange={setCategoryFilter}
            ariaLabel="Filter by category"
            placeholder="All categories"
          />
          {listQuery || categoryFilter ? (
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
              onClick={clearListFilters}
            >
              Clear
            </button>
          ) : null}
        </div>

        {listBusy ? (
          <p className="ua-cfg-panel__sub">{copy?.fetching || "Fetching…"}</p>
        ) : items.length ? (
          <div className={`ua-cfg-rc-list${loading && persist ? " is-loading" : ""}`}>
            {items.map((entry) => {
              const editing = editingId === entry.id;
              return (
                <article key={entry.id} className={`ua-cfg-rc-item ua-cfg-rc-item--lib ua-cfg-recipes-item${editing ? " is-editing" : ""}${entry.type === "VIDEO" || entry.type === "YT" ? " is-video" : " is-text"}`}>
                  <div className="ua-cfg-rc-cover-wrap">
                    <button
                      type="button"
                      className={`ua-cfg-rc-cover${entry.type === "VIDEO" || entry.type === "YT" ? " is-video" : ""} ua-cfg-rc-cover--pick`}
                      disabled={disabled}
                      onClick={() => coverInputRefs.current[entry.id]?.click()}
                    >
                      {entry.thumbnail ? (
                        <img className="ua-cfg-rc-cover__img" src={entry.thumbnail} alt="" />
                      ) : (
                        <span aria-hidden="true">🖼</span>
                      )}
                      <em>{entry.thumbnail ? "Replace" : "Cover"}</em>
                    </button>
                    <input
                      ref={(node) => {
                        coverInputRefs.current[entry.id] = node;
                      }}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) openCoverCrop(file, entry.id);
                      }}
                    />
                  </div>
                  <div className="ua-cfg-rc-item__body">
                    <div className="ua-cfg-rc-item__head">
                      <div className="ua-cfg-rc-item__identity">
                        {editing ? (
                          <input
                            className="ua-cfg-vh-input ua-cfg-rc-title"
                            value={asCopyString(entry.title)}
                            disabled={disabled}
                            onChange={(event) => updateItem(entry.id, { title: event.target.value })}
                          />
                        ) : (
                          <strong>{asCopyString(entry.title)}</strong>
                        )}
                        <div className="ua-cfg-rc-item__meta">
                          {editing ? (
                            <CategorySelect
                              options={categoryOptions}
                              value={asCopyString(entry.category)}
                              disabled={disabled}
                              onChange={(value) => updateItem(entry.id, {
                                category: persistRecipeCategory(value, categoryOptions),
                                categoryLabel: recipeCategoryLabel(value, categoryOptions),
                              })}
                            />
                          ) : (
                            <span className="ua-cfg-rc-pill ua-cfg-rc-pill--cat">
                              {asCopyString(entry.categoryLabel || entry.category) || "—"}
                            </span>
                          )}
                          <span className={`ua-cfg-rc-pill ua-cfg-rc-pill--${entry.type === "VIDEO" || entry.type === "YT" ? "video" : "text"}`}>
                            {entry.type === "YT" ? "YouTube" : entry.type === "VIDEO" ? "Video" : entry.type}
                          </span>
                        </div>
                      </div>
                      <div className="ua-cfg-rc-item__actions">
                        <div className="ua-cfg-rc-item__surfaces">
                          <div className="ua-cfg-rc-item__live">
                            <span className={`ua-cfg-faq__shown${entry.webVisible !== false ? " is-on" : ""}`}>WEB</span>
                            <button
                              type="button"
                              className={`ua-toggle ua-toggle--sm${entry.webVisible !== false ? " ua-toggle--on" : ""}`}
                              aria-pressed={entry.webVisible !== false}
                              aria-label={entry.webVisible !== false ? "Hide on web" : "Show on web"}
                              disabled={disabled}
                              onClick={() => toggleSurface(entry, "webVisible")}
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                          </div>
                          <div className="ua-cfg-rc-item__live">
                            <span className={`ua-cfg-faq__shown${entry.appVisible !== false ? " is-on" : ""}`}>APP</span>
                            <button
                              type="button"
                              className={`ua-toggle ua-toggle--sm${entry.appVisible !== false ? " ua-toggle--on" : ""}`}
                              aria-pressed={entry.appVisible !== false}
                              aria-label={entry.appVisible !== false ? "Hide on app" : "Show on app"}
                              disabled={disabled}
                              onClick={() => toggleSurface(entry, "appVisible")}
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                          </div>
                          <div className="ua-cfg-rc-item__live">
                            <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>{entry.live ? "LIVE" : "HIDDEN"}</span>
                            <button
                              type="button"
                              className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
                              aria-pressed={entry.live}
                              disabled={disabled}
                              onClick={() => toggleLive(entry)}
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                          </div>
                        </div>
                        <div className="ua-cfg-rc-item__btns">
                          <button
                            type="button"
                            className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                            disabled={disabled}
                            onClick={() => setViewingId(entry.id)}
                          >
                            View
                          </button>
                          {editing ? (
                            <>
                              <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" disabled={disabled} onClick={() => saveEditedItem(entry)}>Save</button>
                              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={disabled} onClick={() => setEditingId(null)}>Cancel</button>
                            </>
                          ) : (
                            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={disabled} onClick={() => { setViewingId(null); setEditingId(entry.id); }}>Edit</button>
                          )}
                          <button
                            type="button"
                            className="ua-cfg-icon-btn"
                            aria-label="Delete"
                            disabled={disabled}
                            onClick={() => setPendingDelete(entry)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                    {editing ? (
                      <div className="ua-cfg-rc-edit">
                        <textarea
                          className="ua-cfg-tf-story ua-cfg-rc-edit__desc"
                          rows={3}
                          value={asCopyString(entry.description)}
                          disabled={disabled}
                          onChange={(event) => updateItem(entry.id, { description: event.target.value })}
                        />
                        <div className="ua-cfg-rc-edit__media">
                          <VideoDrop
                            previewUrl={entry.videoPreview || entry.video || ""}
                            embedUrl={(entry.videoPreview || entry.video) ? "" : youtubeEmbedUrl(entry.videoLink)}
                            fileName={entry.videoName}
                            disabled={disabled}
                            onPick={(file) => replaceVideo(entry.id, file)}
                            onRemove={() => clearItemVideo(entry.id)}
                          />
                          <div className="ua-cfg-rc-edit__side">
                            <input
                              className="ua-cfg-vh-input"
                              placeholder="YouTube link · youtube.com/watch?v=…"
                              value={asCopyString(entry.videoLink)}
                              disabled={disabled}
                              onChange={(event) => {
                                const videoLink = event.target.value;
                                if (videoLink.trim()) {
                                  revokeBlobUrl(entry.videoPreview);
                                  updateItem(entry.id, {
                                    videoLink,
                                    videoPreview: "",
                                    videoFile: null,
                                    apiType: "ytlink",
                                    type: "YT",
                                    duration: "YouTube",
                                  });
                                  return;
                                }
                                updateItem(entry.id, { videoLink, apiType: entry.video ? "video" : entry.apiType, type: entry.video ? "VIDEO" : entry.type });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p>{asCopyString(entry.description)}</p>
                        {entry.videoLink ? (
                          <a className="ua-cfg-rc-link" href={entry.videoLink} target="_blank" rel="noreferrer">
                            {entry.videoLink}
                          </a>
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
            {persist && hasListFilters ? (copy?.noneMatch || "No items match your search.") : persist ? (copy?.none || "No items yet.") : "No items yet."}
          </p>
        )}

        {persist ? (
          <ListPagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            pageSize={pageSize}
            onPageChange={setPage}
            label={copy?.pagination || "Pagination"}
          />
        ) : null}
      </Panel>

      {showGallery ? (
        <Panel
          title="Gallery"
          subtitle="Assets uploaded for this section — filter by owner or date, reuse, download or delete. Live assets must be unmarked first."
          actions={
            <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={() => setUpload({ kind: "gallery", target: null })}>
              + Upload media
            </button>
          }
        >
          <div className="ua-cfg-mv-gallery__filters">
            <input type="search" className="ua-cfg-mv-gallery__search" placeholder="Search media by name" value={search} onChange={(event) => setSearch(event.target.value)} />
            <select className="ua-cfg-mv-gallery__select" value={owner} onChange={(event) => setOwner(event.target.value)}>
              {galleryOwners.map((entry) => (
                <option key={entry} value={entry}>{entry}</option>
              ))}
            </select>
            <input type="date" className="ua-cfg-mv-gallery__date" aria-label="From date" />
            <input type="date" className="ua-cfg-mv-gallery__date" aria-label="To date" />
          </div>
          <div className="ua-cfg-mv-gallery__bar">
            <span>{filtered.length} of {gallery.length} items</span>
            {selected.length ? (
              <div className="ua-cfg-mv-gallery__selection">
                <span>{selected.length} selected</span>
                <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => onToast("Download started")}>Download</button>
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
                  disabled={selectedLive}
                  onClick={() => {
                    setGallery((prev) => prev.filter((entry) => !selected.includes(entry.id)));
                    setSelected([]);
                    onToast("Deleted selected items");
                  }}
                >
                  Delete
                </button>
                <button type="button" className="ua-cfg-icon-btn" aria-label="Clear selection" onClick={() => setSelected([])}>×</button>
              </div>
            ) : null}
          </div>
          <div className="ua-cfg-mv-gallery__grid">
            {filtered.map((entry) => {
              const isSelected = selected.includes(entry.id);
              return (
                <article key={entry.id} className={`ua-cfg-mv-gallery-card${isSelected ? " is-selected" : ""}`}>
                  <div className="ua-cfg-mv-gallery-card__thumb ua-cfg-bn-thumb">
                    <label className="ua-cfg-mv-gallery-card__check">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => setSelected((prev) => (prev.includes(entry.id) ? prev.filter((id) => id !== entry.id) : [...prev, entry.id]))}
                      />
                    </label>
                    <span className="ua-cfg-mv-gallery-card__type ua-cfg-rc-badge">{galleryBadge}</span>
                    <span className="ua-cfg-bn-thumb__mark" aria-hidden="true">▶</span>
                    <span className="ua-cfg-gl-card__placeholder">{galleryPlaceholder}</span>
                  </div>
                  <div className="ua-cfg-mv-gallery-card__body">
                    <strong>{asCopyString(entry.title)}</strong>
                    <span>{asCopyString(entry.owner)} · {asCopyString(entry.date)}</span>
                    <span>{asCopyString(entry.size)} · {entry.versions} versions</span>
                  </div>
                  <div className="ua-cfg-mv-gallery-card__live">
                    <span className={`ua-cfg-mv-gallery-card__status${entry.live ? " is-live" : ""}`}>{entry.live ? "Live" : "Not live"}</span>
                    <button
                      type="button"
                      className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
                      aria-pressed={entry.live}
                      onClick={() => setGallery((prev) => prev.map((row) => (row.id === entry.id ? { ...row, live: !row.live } : row)))}
                    >
                      <span className="ua-toggle__knob" />
                    </button>
                  </div>
                  <div className="ua-cfg-mv-gallery-card__actions">
                    <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => setHistory(entry)}>History</button>
                    <button type="button" className="ua-cfg-icon-btn" aria-label="Download" onClick={() => onToast("Download started")}>↓</button>
                    <button
                      type="button"
                      className={`ua-cfg-icon-btn${entry.live ? "" : " ua-cfg-icon-btn--danger"}`}
                      aria-label="Delete"
                      disabled={entry.live}
                      onClick={() => {
                        setGallery((prev) => prev.filter((row) => row.id !== entry.id));
                        setSelected((prev) => prev.filter((id) => id !== entry.id));
                        onToast("Asset deleted");
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </Panel>
      ) : null}

      {!persist ? (
        <UploadConfirmModal
          open={Boolean(upload)}
          label={upload?.kind === "video" ? videoCropLabel : upload?.kind === "cover" ? coverCropLabel : galleryCropLabel}
          defaultRatio={upload?.kind === "video" ? "16:9" : upload?.kind === "cover" ? coverCropRatio : "Original"}
          onClose={() => setUpload(null)}
          onConfirm={() => {
            if (upload?.target === "draft") {
              setDraft((prev) => ({ ...prev, cover: upload.kind === "cover" ? true : prev.cover, video: upload.kind === "video" ? true : prev.video }));
            } else if (upload?.target) {
              updateItem(upload.target, upload.kind === "video" ? { type: "VIDEO", duration: entryDuration(items, upload.target) } : { cover: true });
            } else {
              setGallery((prev) => [
                { id: `rc-g-${Date.now()}`, title: `New ${itemNoun.toLowerCase()} asset`, owner: "Admin", date: "14 Aug 2026", size: "2.1 MB", versions: 1, live: false },
                ...prev,
              ]);
            }
            setUpload(null);
            onToast("File attached");
          }}
        />
      ) : null}

      <LinkModal
        open={Boolean(linkFor)}
        title={linkTitle}
        initialUrl={linkInitialUrl}
        onClose={() => setLinkFor(null)}
        onSave={saveLink}
      />

      {persist ? (
        <RecipeViewModal
          entry={viewingEntry}
          onClose={() => setViewingId(null)}
          onEdit={(id) => setEditingId(id)}
          viewTag={copy?.viewTag}
          itemNoun={itemNoun}
          showSpecs={showSpecs}
        />
      ) : null}

      {!persist ? <HistoryModal entry={history} onClose={() => setHistory(null)} onToast={onToast} /> : null}

      <ImageCropModal
        open={Boolean(cropPending)}
        label={copy?.cropLabel || "recipe cover"}
        file={cropPending?.file}
        previewUrl={cropPending?.previewUrl || ""}
        busy={busy}
        defaultRatio="Original"
        originalAspectCss="16 / 9"
        originalAspectNumber={16 / 9}
        onClose={closeCoverCrop}
        onConfirm={confirmCoverCrop}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag={itemNoun}
        title={`Delete ${asCopyString(pendingDelete?.title) || `this ${itemNoun.toLowerCase()}`}?`}
        body={persist ? (copy?.deleteBody || `This removes it from the catalog.`) : `This removes the ${itemNoun.toLowerCase()} from the library.`}
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function entryDuration(items, id) {
  const entry = items.find((row) => row.id === id);
  if (entry?.type === "VIDEO" && asCopyString(entry.duration).includes(":")) return entry.duration;
  return "2:40";
}
