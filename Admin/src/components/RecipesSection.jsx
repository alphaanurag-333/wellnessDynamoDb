import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";
import { adminGetConfigDropdown, adminListConfigDropdowns } from "../api/configDropdownApi.js";
import {
  adminCreateHealthRecipe,
  adminDeleteHealthRecipe,
  adminListHealthRecipes,
  adminUpdateHealthRecipe,
} from "../api/healthRecipeApi.js";
import {
  emptyRecipeDraft,
  mapDropdownCategoryOptions,
  RECIPE_CATEGORIES,
  RECIPE_CATEGORY_SLUG,
  RECIPE_GALLERY_OWNERS,
  RECIPE_PAGE_SIZE,
  recipeCategoryLabel,
  validateRecipeImage,
  validateRecipeVideo,
  withCategoryLabels,
} from "../data/recipesConfigData.js";
import { ListPagination } from "./shared.jsx";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";

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
        <div>
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

function LinkModal({ open, title, onClose, onSave }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!open) setUrl("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
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

function CategorySelect({ options, value, disabled, onChange }) {
  return (
    <select
      className="ua-cfg-rc-cat"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {!options.length ? <option value="">No categories</option> : null}
      {options.map((entry) => (
        <option key={entry.value} value={entry.value}>{entry.label}</option>
      ))}
    </select>
  );
}

function CoverDrop({ previewUrl, disabled, label = "Cover", onPick }) {
  const inputRef = useRef(null);
  return (
    <div className="ua-cfg-rc-cover-drop-wrap">
      <button
        type="button"
        className={`ua-cfg-rc-cover-drop${previewUrl ? " is-on" : ""}`}
        disabled={disabled}
        aria-label={previewUrl ? "Replace cover" : "Add cover"}
        onClick={() => inputRef.current?.click()}
      >
        {previewUrl ? (
          <img className="ua-cfg-rc-drop-preview" src={previewUrl} alt="" />
        ) : (
          <span aria-hidden="true">🖼</span>
        )}
        <em>{previewUrl ? "Replace" : label}</em>
      </button>
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

export function RecipesSection({
  editor,
  setEditor,
  items,
  setItems,
  gallery,
  setGallery,
  onToast,
  persistToHealthRecipes = false,
  hideGallery = false,
  categories = RECIPE_CATEGORIES,
  galleryOwners = RECIPE_GALLERY_OWNERS,
  titlePlaceholder = "Title · e.g. Ragi dosa · high fibre",
  descriptionPlaceholder = "Recipe description shown in the app...",
  galleryBadge = "Recipe",
  galleryPlaceholder = "Recipe media",
  itemNoun = "Recipe",
  videoCropLabel = "libvideo",
  coverCropLabel = "cover",
  galleryCropLabel = "recipe",
  coverCropRatio = "3:4",
}) {
  const persist = persistToHealthRecipes;
  const showGallery = !hideGallery && !persist;
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [upload, setUpload] = useState(null);
  const [linkFor, setLinkFor] = useState(null);
  const [categoryOptions, setCategoryOptions] = useState(
    persist ? [] : (categories || []).map((entry) => ({ value: entry, label: entry })),
  );
  const [draft, setDraft] = useState(emptyRecipeDraft(persist ? "" : (categories[0] || "")));
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("All owners");
  const [selected, setSelected] = useState([]);
  const [history, setHistory] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: RECIPE_PAGE_SIZE,
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
  const videoInputRefs = useRef({});

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
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
  }, [cropPending?.previewUrl]);

  const loadCategories = useCallback(async () => {
    if (!persist) return;
    try {
      let list = null;
      try {
        list = await adminGetConfigDropdown(null, RECIPE_CATEGORY_SLUG);
      } catch {
        const { lists } = await adminListConfigDropdowns(null, { limit: 50 });
        list = (lists || []).find((row) => row.slug === RECIPE_CATEGORY_SLUG) || null;
      }
      const options = mapDropdownCategoryOptions(list);
      setCategoryOptions(options);
      setDraft((prev) => ({
        ...prev,
        category: prev.category || options[0]?.value || "",
      }));
    } catch (error) {
      onToast(error?.message || "Failed to load recipe categories");
      setCategoryOptions([]);
    }
  }, [onToast, persist]);

  const loadItems = useCallback(async (pageOverride) => {
    if (!persist) return;
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      const { items: rows, pagination: nextPagination } = await adminListHealthRecipes(null, {
        page: nextPage,
        limit: RECIPE_PAGE_SIZE,
      });
      const next = withCategoryLabels(rows || [], categoryOptionsRef.current);
      setItems(next);
      itemsRef.current = next;
      setPagination({
        page: Number(nextPagination?.page) || nextPage,
        limit: Number(nextPagination?.limit) || RECIPE_PAGE_SIZE,
        total: Number(nextPagination?.total) || next.length,
        pages: Number(nextPagination?.pages) || 1,
      });
    } catch (error) {
      onToast(error?.message || "Failed to load recipes");
      setItems([]);
      itemsRef.current = [];
      setPagination({ page: 1, limit: RECIPE_PAGE_SIZE, total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [onToast, page, persist, setItems]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!persist) return undefined;
    loadItems();
    return undefined;
  }, [loadItems, persist]);

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
    setDraft((prev) => ({ ...prev, videoFile: file, videoName: file.name }));
  }

  async function persistItem(id, fields, files, successMessage) {
    setBusy(true);
    try {
      const updated = await adminUpdateHealthRecipe(null, id, fields, files);
      if (!updated) throw new Error("Failed to save recipe");
      const labelled = {
        ...updated,
        categoryLabel: recipeCategoryLabel(updated.category, categoryOptions),
      };
      updateItem(id, labelled);
      if (successMessage) onToast(successMessage);
      return labelled;
    } catch (error) {
      onToast(error?.message || "Failed to save recipe");
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
      if (!category) {
        onToast("Choose a recipe category");
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
        const created = await adminCreateHealthRecipe(
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
        if (!created) throw new Error("Failed to add recipe");
        if (draft.coverPreview.startsWith("blob:")) URL.revokeObjectURL(draft.coverPreview);
        setDraft(emptyRecipeDraft(categoryOptions[0]?.value || ""));
        setCreating(false);
        onToast(`${itemNoun} added`);
        setPage(1);
        await loadItems(1);
      } catch (error) {
        onToast(error?.message || "Failed to add recipe");
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
    const category = asCopyString(entry.category).trim();
    if (!title || !description) {
      onToast("Add a title and description");
      return;
    }
    if (!category) {
      onToast("Choose a recipe category");
      return;
    }
    const saved = await persistItem(entry.id, { title, description, category }, {}, `${itemNoun} saved`);
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

  async function saveLink(url) {
    if (!url) return;
    if (linkFor === "draft") {
      setDraft((prev) => ({ ...prev, videoLink: url, videoFile: null, videoName: "" }));
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

  async function replaceVideo(id, file) {
    const error = validateRecipeVideo(file);
    if (error) {
      onToast(error);
      return;
    }
    if (!persist) {
      updateItem(id, { type: "VIDEO", duration: "2:40" });
      onToast("Video attached");
      return;
    }
    await persistItem(id, { type: "video", ytLink: "" }, { videoFile: file }, "Video updated");
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
      await adminDeleteHealthRecipe(null, entry.id);
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
      onToast(error?.message || "Failed to delete recipe");
    } finally {
      setBusy(false);
    }
  }

  const liveCount = items.filter((entry) => entry.live).length;
  const filtered = useMemo(() => {
    return (gallery || []).filter((entry) => {
      const matchesSearch = asCopyString(entry.title).toLowerCase().includes(search.trim().toLowerCase());
      const matchesOwner = owner === "All owners" || entry.owner === owner;
      return matchesSearch && matchesOwner;
    });
  }, [gallery, owner, search]);
  const selectedLive = selected.some((id) => gallery?.find((entry) => entry.id === id)?.live);
  const linkTitle = linkFor === "draft" ? "New library item" : asCopyString(items.find((entry) => entry.id === linkFor)?.title);
  const disabled = busy || loading;

  return (
    <div className="ua-cfg-rc">
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
        title="Library items"
        subtitle={
          persist
            ? loading
              ? "Loading recipes…"
              : "Health recipes from the catalog. Cover photo plus a YouTube link or video file."
            : "Admin and Support upload · coaches choose what each client sees."
        }
        actions={
          <button type="button" className="ua-cfg-rc-add" disabled={disabled} onClick={() => setCreating(true)}>
            + Add item
          </button>
        }
      >
        {creating ? (
          <section className="ua-cfg-rc-new">
            <div className="ua-cfg-rc-new__head">
              <strong><span aria-hidden="true">🎬</span> New library item</strong>
              <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={() => setCreating(false)}>×</button>
            </div>
            <div className="ua-cfg-rc-new__grid">
              <div className="ua-cfg-rc-new__media">
                {persist ? (
                  <CoverDrop
                    previewUrl={draft.coverPreview}
                    disabled={disabled}
                    onPick={pickDraftCover}
                  />
                ) : (
                  <div className={`ua-cfg-vh-drop ua-cfg-vh-drop--cover${draft.cover ? " is-on" : ""}`}>
                    <span aria-hidden="true">🖼</span>
                    <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setUpload({ kind: "cover", target: "draft" })}>
                      {draft.cover ? "Replace cover" : "Cover photo"}
                    </button>
                  </div>
                )}
                <div className={`ua-cfg-vh-drop ua-cfg-rc-video-drop${draft.videoFile || draft.video ? " is-on" : ""}`}>
                  <span className="ua-cfg-vh-drop__play" aria-hidden="true">▶</span>
                  {persist ? (
                    <FileButton
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogg,.mov,.m4v"
                      disabled={disabled}
                      label={draft.videoName || "Upload video"}
                      onPick={pickDraftVideo}
                    />
                  ) : (
                    <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setUpload({ kind: "video", target: "draft" })}>
                      Upload video
                    </button>
                  )}
                </div>
              </div>
              <div className="ua-cfg-rc-new__fields">
                <CategorySelect
                  options={categoryOptions}
                  value={draft.category}
                  disabled={disabled}
                  onChange={(value) => setDraft((prev) => ({ ...prev, category: value }))}
                />
                {persist && !categoryOptions.length ? (
                  <p className="ua-cfg-panel__sub">Add recipe categories in Configs → Dropdowns first.</p>
                ) : null}
                <input
                  className="ua-cfg-vh-input"
                  placeholder={titlePlaceholder}
                  value={asCopyString(draft.title)}
                  disabled={disabled}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                />
                <textarea
                  className="ua-cfg-tf-story"
                  rows={3}
                  placeholder={descriptionPlaceholder}
                  value={asCopyString(draft.description)}
                  disabled={disabled}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                />
                <input
                  className="ua-cfg-vh-input"
                  placeholder="Or paste a video link · youtube.com/..."
                  value={asCopyString(draft.videoLink)}
                  disabled={disabled}
                  onChange={(event) => setDraft((prev) => ({ ...prev, videoLink: event.target.value, videoFile: null, videoName: "" }))}
                />
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={disabled} onClick={addItem}>
                  {busy && creating ? "Saving…" : "Add item"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <p className="ua-cfg-panel__sub">
          {persist
            ? `${liveCount} of ${pagination.total || items.length} live`
            : `Drag to reorder · ${liveCount} of ${items.length} live`}
        </p>

        {loading && persist ? (
          <p className="ua-cfg-panel__sub">Fetching recipes…</p>
        ) : items.length ? (
          <div className="ua-cfg-rc-list">
            {items.map((entry, index) => {
              const editing = editingId === entry.id;
              return (
                <article key={entry.id} className={`ua-cfg-rc-item${entry.type === "VIDEO" || entry.type === "YT" ? " is-video" : " is-text"}`}>
                  {persist ? (
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
                          <span aria-hidden="true">▶</span>
                        )}
                        <em>Edit</em>
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
                  ) : (
                    <div className={`ua-cfg-rc-cover${entry.type === "VIDEO" || entry.type === "YT" ? " is-video" : ""}`}>
                      {entry.thumbnail ? (
                        <img className="ua-cfg-rc-cover__img" src={entry.thumbnail} alt="" />
                      ) : (
                        <span aria-hidden="true">▶</span>
                      )}
                      <em>Cover</em>
                    </div>
                  )}
                  <div className="ua-cfg-rc-item__body">
                    <div className="ua-cfg-rc-item__row">
                      {!persist ? <span className="ua-cfg-bn-live__handle" aria-hidden="true">⠿</span> : null}
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
                      {editing ? (
                        <CategorySelect
                          options={categoryOptions}
                          value={asCopyString(entry.category)}
                          disabled={disabled}
                          onChange={(value) => updateItem(entry.id, { category: value, categoryLabel: recipeCategoryLabel(value, categoryOptions) })}
                        />
                      ) : (
                        <span className="ua-cfg-rc-pill ua-cfg-rc-pill--cat">
                          {asCopyString(entry.categoryLabel || entry.category) || "—"}
                        </span>
                      )}
                      <span className={`ua-cfg-rc-pill ua-cfg-rc-pill--${entry.type === "VIDEO" || entry.type === "YT" ? "video" : "text"}`}>
                        {entry.type === "YT" ? "YT LINK" : entry.type}
                      </span>
                      <em>{asCopyString(entry.duration)}</em>
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
                      {persist ? (
                        <>
                          <button
                            type="button"
                            className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                            disabled={disabled}
                            onClick={() => videoInputRefs.current[entry.id]?.click()}
                          >
                            Video
                          </button>
                          <input
                            ref={(node) => {
                              videoInputRefs.current[entry.id] = node;
                            }}
                            type="file"
                            accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogg,.mov,.m4v"
                            hidden
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              event.target.value = "";
                              if (file) replaceVideo(entry.id, file);
                            }}
                          />
                        </>
                      ) : (
                        <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => setUpload({ kind: "video", target: entry.id })}>Video</button>
                      )}
                      <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" disabled={disabled} onClick={() => setLinkFor(entry.id)}>Link</button>
                      {editing ? (
                        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" disabled={disabled} onClick={() => saveEditedItem(entry)}>Save</button>
                      ) : (
                        <button type="button" className="ua-cfg-cr-link ua-cfg-cr-link--modify" disabled={disabled} onClick={() => setEditingId(entry.id)}>Edit</button>
                      )}
                      {!persist ? (
                        <>
                          <button type="button" className="ua-cfg-icon-btn" aria-label="Move up" disabled={index === 0} onClick={() => moveItem(index, -1)}>↑</button>
                          <button type="button" className="ua-cfg-icon-btn" aria-label="Move down" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}>↓</button>
                        </>
                      ) : null}
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
                    {editing ? (
                      <textarea
                        className="ua-cfg-tf-story"
                        rows={2}
                        value={asCopyString(entry.description)}
                        disabled={disabled}
                        onChange={(event) => updateItem(entry.id, { description: event.target.value })}
                      />
                    ) : (
                      <p>{asCopyString(entry.description)}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">{persist ? "No recipes yet." : "No items yet."}</p>
        )}

        {persist ? (
          <ListPagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            pageSize={RECIPE_PAGE_SIZE}
            onPageChange={setPage}
            label="Recipe pagination"
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
        onClose={() => setLinkFor(null)}
        onSave={saveLink}
      />

      {!persist ? <HistoryModal entry={history} onClose={() => setHistory(null)} onToast={onToast} /> : null}

      <ImageCropModal
        open={Boolean(cropPending)}
        label="recipe cover"
        file={cropPending?.file}
        previewUrl={cropPending?.previewUrl || ""}
        busy={busy}
        defaultRatio="16:9"
        originalAspectCss="16 / 9"
        originalAspectNumber={16 / 9}
        onClose={closeCoverCrop}
        onConfirm={confirmCoverCrop}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag={itemNoun}
        title={`Delete ${asCopyString(pendingDelete?.title) || "this recipe"}?`}
        body={persist ? "This removes it from the health recipe catalog." : `This removes the ${itemNoun.toLowerCase()} from the library.`}
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
