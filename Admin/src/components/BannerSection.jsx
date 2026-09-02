import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminCreateBanner,
  adminDeleteBanner,
  adminListBanners,
  adminReorderBanners,
  adminUpdateBanner,
  editorFromBanner,
} from "../api/bannerApi.js";
import { adminListConfigDropdowns } from "../api/configDropdownApi.js";
import {
  adminDeleteMediaAsset,
  adminListMediaAssets,
  adminUpdateMediaAsset,
  attachMediaAsset,
  downloadMediaAsset,
  galleryOwnersFromAssets,
} from "../api/mediaAssetApi.js";
import {
  BANNER_COPY,
  BANNER_DESKTOP_SIZE,
  BANNER_MEDIA_CATEGORY,
  BANNER_MOBILE_SIZE,
  BANNER_PAGE_SIZE,
  BANNER_PLACEMENTS,
  BANNER_TYPES,
  asCopyString,
  bannerPlacementById,
  emptyBannerEditor,
  mapDropdownOptions,
  optionLabel,
  placementChipLabel,
  preserveOption,
} from "../data/bannerConfigData.js";
import { galleryVersionLabel } from "../data/galleryData.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";
import { MediaPickerModal } from "./MediaPickerModal.jsx";
import { SectionSurfacePanel } from "./SectionSurfacePanel.jsx";
import { CfgSelect, ListPagination } from "./shared.jsx";
import { BannerLivePreview } from "./BannerLivePreview.jsx";
import { useMediaPicker } from "./useMediaPicker.jsx";
import "./bannerConfig.css";

function Panel({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
      <div className="ua-cfg-panel__head">
        <div className="ua-cfg-panel__copy">
          <h3 className="ua-cfg-panel__title">{title}</h3>
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function bannerCropForKind(kind) {
  return kind === "mobile" ? BANNER_MOBILE_SIZE : BANNER_DESKTOP_SIZE;
}

function applyBannerOrder(items, fromId, toId) {
  if (!fromId || !toId || fromId === toId) return items;
  const fromIdx = items.findIndex((entry) => entry.id === fromId);
  const toIdx = items.findIndex((entry) => entry.id === toId);
  if (fromIdx < 0 || toIdx < 0) return items;
  const next = [...items];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next.map((entry, index) => ({ ...entry, sortOrder: index + 1 }));
}

const BANNER_DROP_ICON = (
  <span className="ua-cfg-bn-drop__icon" aria-hidden="true">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  </span>
);

function DropZone({ label, previewUrl, onUpload, className = "" }) {
  const uploaded = Boolean(previewUrl);
  return (
    <div className={`ua-cfg-bn-drop${uploaded ? " is-filled" : ""}${className ? ` ${className}` : ""}`}>
      {uploaded ? <img className="ua-cfg-bn-drop__img" src={previewUrl} alt="" /> : BANNER_DROP_ICON}
      <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-bn-drop__btn" onClick={onUpload}>
        {uploaded ? label.replace(/^Upload/, "Replace") : label}
         
      </button>
    </div>
  );
}

function LiveToggle({ label, on, disabled, ariaLabel, onToggle }) {
  return (
    <div className="ua-cfg-bn-live__surface">
      <span className={`ua-cfg-faq__shown${on ? " is-on" : ""}`}>{label}</span>
      <button
        type="button"
        className={`ua-toggle ua-toggle--sm${on ? " ua-toggle--on" : ""}`}
        aria-pressed={on}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={onToggle}
      >
        <span className="ua-toggle__knob" />
      </button>
    </div>
  );
}

export function BannerSection({ editor, setEditor, items, setItems, onToast, surfaceEditor, setSurfaceEditor }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [bannerTypes, setBannerTypes] = useState(BANNER_TYPES.map((row) => ({ ...row, value: row.id })));
  const [placements, setPlacements] = useState(BANNER_PLACEMENTS.map((row) => ({ ...row, value: row.id })));
  const [headlines, setHeadlines] = useState(BANNER_COPY.map((row) => ({
    id: row.headline,
    value: row.headline,
    label: row.headline,
    body: row.body,
    cta: row.cta,
  })));
  const [cropPending, setCropPending] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [galleryQuery, setGalleryQuery] = useState("");
  const [galleryOwner, setGalleryOwner] = useState("All owners");
  const [page, setPage] = useState(1);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [bannerMedia, setBannerMedia] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [galleryBusyId, setGalleryBusyId] = useState("");
  const [pendingMediaDelete, setPendingMediaDelete] = useState(null);
  const cropKindRef = useRef("banner");
  const creatingRef = useRef(false);
  const liveListRef = useRef(null);
  const itemsRef = useRef(items);
  creatingRef.current = creating;
  itemsRef.current = items;

  const bodyText = asCopyString(editor.body);
  const typeOptions = preserveOption(editor.type, bannerTypes, BANNER_TYPES);
  const placementOptions = preserveOption(editor.placement, placements, BANNER_PLACEMENTS);
  const placement = bannerPlacementById(editor.placement, placementOptions);
  const webPreview = editor.imagePreview || editor.image;
  const mobileSlotPreview = editor.mobilePreview || editor.mobileImage;
  const mobilePreview = mobileSlotPreview || webPreview;
  const cropSpec = bannerCropForKind(cropPending?.kind);
  const webSurfaceOn = surfaceEditor?.webOn !== false && editor.webOn !== false;
  const appSurfaceOn = surfaceEditor?.appOn !== false && editor.appOn !== false;
  const headlineOptions = useMemo(() => {
    const current = String(editor.headline || "").trim();
    if (!current || headlines.some((row) => row.label === current || row.value === current)) return headlines;
    return [...headlines, { id: current, value: current, label: current }];
  }, [editor.headline, headlines]);
  const headlineValue = headlines.find((row) => row.label === editor.headline || row.value === editor.headline)?.value
    || editor.headline
    || "";

  const loadDropdowns = useCallback(async () => {
    try {
      const { lists } = await adminListConfigDropdowns(null, { limit: 80 });
      const bySlug = new Map((lists || []).map((row) => [row.slug, row]));
      const types = mapDropdownOptions(bySlug.get("banner-type"), BANNER_TYPES);
      const places = mapDropdownOptions(bySlug.get("banner-placement"), BANNER_PLACEMENTS);
      const copy = mapDropdownOptions(bySlug.get("banner-headline"), BANNER_COPY.map((row) => ({
        id: row.headline,
        label: row.headline,
      })));
      if (types.length) setBannerTypes(types);
      if (places.length) setPlacements(places);
      if (copy.length) {
        setHeadlines(copy.map((row) => ({
          ...row,
          body: BANNER_COPY.find((entry) => entry.headline === row.label)?.body || "",
          cta: BANNER_COPY.find((entry) => entry.headline === row.label)?.cta || "",
        })));
      }
      setEditor((prev) => ({
        ...prev,
        type: prev.type || types[0]?.value || "main",
        placement: prev.placement || places[0]?.value || "",
      }));
    } catch {
      /* keep static fallbacks */
    }
  }, [setEditor]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminListBanners(null, { page: 1, limit: 200 });
      const next = result.items || [];
      setItems(next);
      setEditor((prev) => {
        if (creatingRef.current) return prev;
        const selected = next.find((row) => row.id === prev.id) || next[0];
        if (!selected) return { ...emptyBannerEditor(), type: prev.type, placement: prev.placement };
        return editorFromBanner(selected, emptyBannerEditor());
      });
      return next;
    } catch (error) {
      setItems([]);
      onToast(error?.message || "Could not load banners");
      return [];
    } finally {
      setLoading(false);
    }
  }, [onToast, setEditor, setItems]);

  useEffect(() => {
    loadDropdowns();
  }, [loadDropdowns]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const loadBannerGallery = useCallback(async () => {
    setGalleryLoading(true);
    try {
      const result = await adminListMediaAssets(null, {
        page: 1,
        limit: 200,
        type: "image",
        category: BANNER_MEDIA_CATEGORY,
        search: galleryQuery.trim() || undefined,
        owner: galleryOwner === "All owners" ? undefined : galleryOwner,
      });
      setBannerMedia(Array.isArray(result?.items) ? result.items : []);
    } catch (error) {
      setBannerMedia([]);
      onToast(error?.message || "Could not load banner gallery");
    } finally {
      setGalleryLoading(false);
    }
  }, [galleryOwner, galleryQuery, onToast]);

  useEffect(() => {
    const timer = setTimeout(loadBannerGallery, 200);
    return () => clearTimeout(timer);
  }, [loadBannerGallery]);

  useEffect(() => () => {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
  }, [cropPending?.previewUrl]);

  const webLiveCount = items.filter((row) => row.shown && row.webOn !== false).length;
  const pageCount = Math.max(1, Math.ceil((items.length || 0) / BANNER_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const pageStart = (safePage - 1) * BANNER_PAGE_SIZE;
  const pagedItems = items.slice(pageStart, pageStart + BANNER_PAGE_SIZE);

  useEffect(() => {
    setPage((current) => Math.min(Math.max(1, current), pageCount));
  }, [pageCount]);

  function goToPage(nextPage, totalItems = items.length) {
    const pages = Math.max(1, Math.ceil((totalItems || 0) / BANNER_PAGE_SIZE));
    setPage(Math.min(Math.max(1, nextPage), pages));
    liveListRef.current?.scrollTo({ top: 0 });
  }

  function goToItemPage(id, list = items) {
    const index = list.findIndex((row) => row.id === id);
    if (index < 0) return;
    goToPage(Math.floor(index / BANNER_PAGE_SIZE) + 1, list.length);
  }

  function patch(next) {
    setEditor((prev) => ({ ...prev, ...next }));
  }

  function startCreate() {
    setCreating(true);
    setEditor({
      ...emptyBannerEditor(),
      type: bannerTypes[0]?.value || "main",
      placement: placements[0]?.value || "",
    });
  }

  function cancelCreate() {
    setCreating(false);
    const selected = items.find((row) => row.id === editor.id) || items[0];
    if (selected) setEditor(editorFromBanner(selected, emptyBannerEditor()));
    else {
      setEditor({
        ...emptyBannerEditor(),
        type: bannerTypes[0]?.value || "main",
        placement: placements[0]?.value || "",
      });
    }
  }

  function selectItem(item) {
    setCreating(false);
    setEditor(editorFromBanner(item, emptyBannerEditor()));
  }

  function openFilePicker(kind) {
    cropKindRef.current = kind;
    openMediaPicker(kind);
  }

  function beginCropFromFile(file, kind = cropKindRef.current) {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      onToast("Choose an image file");
      return;
    }
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending({
      kind,
      file,
      previewUrl: URL.createObjectURL(file),
    });
  }

  const { openPicker: openMediaPicker, mediaPickerModal } = useMediaPicker({
    accept: "image",
    title: "Choose banner image",
    cropImages: false,
    showFrameworks: false,
    resolveSizeHint: (kind) => bannerCropForKind(kind).label,
    onFiles: (file, kind) => beginCropFromFile(file, kind || cropKindRef.current),
    onError: (error) => onToast(error?.message || "Could not attach media"),
  });

  function closeCrop() {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending(null);
  }

  async function confirmCrop(croppedFile, cropError) {
    if (cropError) {
      onToast(cropError.message || "Failed to crop image");
      return;
    }
    if (!croppedFile || !cropPending) return;
    const kind = cropPending.kind;
    closeCrop();
    const preview = URL.createObjectURL(croppedFile);
    if (!editor.id) {
      if (kind === "mobile") {
        if (editor.mobilePreview?.startsWith("blob:")) URL.revokeObjectURL(editor.mobilePreview);
        patch({ mobileFile: croppedFile, mobilePreview: preview, mobileUploaded: true });
      } else if (kind === "web") {
        if (editor.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(editor.imagePreview);
        patch({ imageFile: croppedFile, imagePreview: preview, webUploaded: true, uploaded: true });
      } else {
        if (editor.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(editor.imagePreview);
        if (editor.mobilePreview?.startsWith("blob:")) URL.revokeObjectURL(editor.mobilePreview);
        patch({
          imageFile: croppedFile,
          mobileFile: null,
          imagePreview: preview,
          mobilePreview: "",
          uploaded: true,
          webUploaded: true,
          mobileUploaded: true,
        });
      }
      onToast("Banner attached");
      return;
    }
    setBusy(true);
    try {
      const files =
        kind === "mobile"
          ? { mobileFile: croppedFile }
          : kind === "banner" || !editor.split
            ? { imageFile: croppedFile, mobileFile: croppedFile }
            : { imageFile: croppedFile };
      const saved = await adminUpdateBanner(null, editor.id, { split: Boolean(editor.split) }, files);
      selectItem(saved);
      setItems((prev) => prev.map((row) => (row.id === saved.id ? saved : row)));
      onToast(kind === "mobile" ? "Mobile banner updated" : "Banner image updated");
    } catch (error) {
      URL.revokeObjectURL(preview);
      onToast(error?.message || "Could not update the banner image");
    } finally {
      setBusy(false);
    }
  }

  function editorPayload() {
    return {
      title: String(editor.headline || "").trim(),
      description: String(bodyText || "").trim(),
      type: editor.type,
      placement: editor.placement,
      cta: editor.cta,
      ctaLink: editor.ctaLink,
      split: Boolean(editor.split),
      appOn: editor.appOn !== false,
      webOn: editor.webOn !== false,
    };
  }

  async function saveEditor() {
    const payload = editorPayload();
    if (!payload.title || !payload.description) {
      onToast("Add the headline and body copy");
      return;
    }
    if (!payload.type) {
      onToast("Pick a banner type from Configs → Dropdowns");
      return;
    }
    const hasDesktop = editor.imageFile instanceof File || Boolean(editor.image);
    const hasMobile = editor.mobileFile instanceof File || Boolean(editor.mobileImage);
    if (!editor.id && !hasDesktop && !(payload.split && hasMobile)) {
      onToast(payload.split ? "Add a desktop or mobile banner image" : "Add a banner image");
      return;
    }
    if (!editor.id && payload.split && !hasDesktop) {
      onToast("Add a desktop banner image");
      return;
    }
    if (!editor.id && payload.split && !hasMobile) {
      onToast("Add a mobile banner image");
      return;
    }
    setBusy(true);
    try {
      if (!editor.id) {
        const sharedFile = editor.imageFile || editor.mobileFile;
        const created = await adminCreateBanner(null, payload, {
          imageFile: editor.imageFile || sharedFile,
          mobileFile: payload.split
            ? (editor.mobileFile || editor.imageFile || sharedFile)
            : (editor.imageFile || sharedFile),
        });
        setCreating(false);
        onToast("Banner added");
        const next = await loadItems();
        setPage(1);
        if (created?.id) {
          selectItem(created);
          goToItemPage(created.id, next);
        }
      } else {
        const saved = await adminUpdateBanner(null, editor.id, payload);
        setItems((prev) => prev.map((row) => (row.id === saved.id ? saved : row)));
        selectItem(saved);
        onToast("Banner saved");
      }
    } catch (error) {
      onToast(error?.message || "Could not save banner");
    } finally {
      setBusy(false);
    }
  }

  async function persistPatch(item, fields) {
    if (!item?.id || busy) return;
    const previous = items;
    setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, ...fields } : row)));
    if (editor.id === item.id) patch(fields);
    try {
      const saved = await adminUpdateBanner(null, item.id, fields);
      setItems((prev) => prev.map((row) => (row.id === saved.id ? saved : row)));
      if (editor.id === saved.id) {
        patch({
          appOn: saved.appOn,
          webOn: saved.webOn,
          image: saved.image,
          mobileImage: saved.mobileImage,
          uploaded: saved.uploaded,
          webUploaded: saved.webUploaded,
          mobileUploaded: saved.mobileUploaded,
        });
      }
    } catch (error) {
      setItems(previous);
      onToast(error?.message || "Could not update banner");
    }
  }

  async function moveItem(index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length || busy) return;
    const ordered = [...items];
    const [row] = ordered.splice(index, 1);
    ordered.splice(nextIndex, 0, row);
    setItems(ordered);
    goToPage(Math.floor(nextIndex / BANNER_PAGE_SIZE) + 1);
    try {
      const saved = await adminReorderBanners(null, ordered.map((entry) => entry.id));
      if (saved?.length) setItems(saved);
    } catch (error) {
      onToast(error?.message || "Could not reorder banners");
      loadItems();
    }
  }

  async function finishDrag(fromId, toId) {
    if (!fromId || !toId || fromId === toId || busy) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const previous = itemsRef.current;
    const next = applyBannerOrder(previous, fromId, toId);
    setDragId(null);
    setDragOverId(null);
    if (next === previous || next.every((entry, i) => entry.id === previous[i]?.id)) return;
    setItems(next);
    const droppedIndex = next.findIndex((entry) => entry.id === fromId);
    if (droppedIndex >= 0) goToItemPage(fromId, next);
    try {
      const saved = await adminReorderBanners(null, next.map((entry) => entry.id));
      if (saved?.length) setItems(saved);
      onToast("Order updated");
    } catch (error) {
      setItems(previous);
      onToast(error?.message || "Could not reorder banners");
    }
  }

  async function deleteItem() {
    if (!pendingDelete) return;
    const item = pendingDelete;
    setPendingDelete(null);
    setBusy(true);
    try {
      await adminDeleteBanner(null, item.id);
      onToast("Banner deleted");
      await loadItems();
    } catch (error) {
      onToast(error?.message || "Could not delete banner");
    } finally {
      setBusy(false);
    }
  }

  async function useGalleryImage(asset) {
    if (!asset?.url || busy) return;
    setBusy(true);
    try {
      const file = await attachMediaAsset(asset);
      const kind = asset.kind === "Mobile" || asset.slot === "mobile"
        ? "mobile"
        : editor.split
          ? "web"
          : "banner";
      beginCropFromFile(file, kind);
    } catch (error) {
      onToast(error?.message || "Could not use gallery image");
    } finally {
      setBusy(false);
    }
  }

  async function toggleGalleryLive(entry) {
    if (!entry?.id || entry.source !== "library") return;
    setGalleryBusyId(entry.id);
    try {
      const updated = await adminUpdateMediaAsset(null, entry.id, { live: !entry.live });
      setBannerMedia((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      onToast(updated.live ? "Marked live in gallery" : "Unmarked in gallery");
    } catch (error) {
      onToast(error?.message || "Could not update gallery asset");
    } finally {
      setGalleryBusyId("");
    }
  }

  async function downloadGalleryAsset(entry) {
    if (!entry?.url) {
      onToast("No file available to download");
      return;
    }
    setGalleryBusyId(entry.id);
    try {
      await downloadMediaAsset(entry);
      onToast("Download started");
    } catch (error) {
      onToast(error?.message || "Failed to download file");
    } finally {
      setGalleryBusyId("");
    }
  }

  async function confirmMediaDelete() {
    if (!pendingMediaDelete?.id || pendingMediaDelete.source !== "library") {
      setPendingMediaDelete(null);
      return;
    }
    const id = pendingMediaDelete.id;
    setPendingMediaDelete(null);
    setGalleryBusyId(id);
    try {
      await adminDeleteMediaAsset(null, id);
      setBannerMedia((prev) => prev.filter((row) => row.id !== id));
      onToast("Removed from banner gallery");
    } catch (error) {
      onToast(error?.message || "Could not delete gallery asset");
      loadBannerGallery();
    } finally {
      setGalleryBusyId("");
    }
  }

  const galleryFromBanners = useMemo(() => {
    const rows = [];
    const seen = new Set();
    for (const entry of items) {
      const title = asCopyString(entry.title) || "Untitled banner";
      const date = entry.updatedAt || entry.createdAt
        ? new Date(entry.updatedAt || entry.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—";
      const desktop = String(entry.image || "").trim();
      const mobile = String(entry.mobileImage || "").trim();
      if (desktop && !seen.has(desktop)) {
        seen.add(desktop);
        rows.push({
          id: `banner-${entry.id}-desktop`,
          source: "banner",
          bannerId: entry.id,
          slot: "desktop",
          kind: "Desktop",
          title,
          owner: "Banner",
          date,
          size: "",
          versions: 1,
          live: Boolean(entry.shown),
          url: desktop,
          type: "image",
          category: BANNER_MEDIA_CATEGORY,
        });
      }
      if (mobile && mobile !== desktop && !seen.has(mobile)) {
        seen.add(mobile);
        rows.push({
          id: `banner-${entry.id}-mobile`,
          source: "banner",
          bannerId: entry.id,
          slot: "mobile",
          kind: "Mobile",
          title,
          owner: "Banner",
          date,
          size: "",
          versions: 1,
          live: Boolean(entry.shown),
          url: mobile,
          type: "image",
          category: BANNER_MEDIA_CATEGORY,
        });
      }
    }
    return rows;
  }, [items]);

  const galleryFromLibrary = useMemo(
    () =>
      bannerMedia.map((entry) => ({
        ...entry,
        source: "library",
        kind: "Library",
        slot: "desktop",
      })),
    [bannerMedia],
  );

  const filteredGallery = useMemo(() => {
    const map = new Map();
    for (const entry of [...galleryFromLibrary, ...galleryFromBanners]) {
      const key = entry.url || entry.id;
      if (!key || map.has(key)) continue;
      map.set(key, entry);
    }
    let rows = Array.from(map.values());
    const query = galleryQuery.trim().toLowerCase();
    if (query) {
      rows = rows.filter((entry) =>
        [entry.title, entry.owner, entry.kind, entry.category]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    }
    if (galleryOwner !== "All owners") {
      rows = rows.filter((entry) => entry.owner === galleryOwner);
    }
    return rows;
  }, [galleryFromBanners, galleryFromLibrary, galleryOwner, galleryQuery]);

  const galleryOwners = useMemo(
    () => galleryOwnersFromAssets(filteredGallery),
    [filteredGallery],
  );

  return (
    <div className="ua-cfg-bn">
      <SectionSurfacePanel
        sectionId="banner"
        editor={surfaceEditor}
        setEditor={setSurfaceEditor}
        onToast={onToast}
      />

      <div className="ua-cfg-bn-layout">
        <Panel
          className={creating || !editor.id ? "ua-cfg-bn-editor-panel is-new" : "ua-cfg-bn-editor-panel"}
          title={creating || !editor.id ? "New banner" : "Edit banner"}
          subtitle={creating || !editor.id ? "Artwork, placement and copy." : asCopyString(editor.headline) || "Update artwork and copy."}
          actions={creating || !editor.id ? (
            <button type="button" className="ua-cfg-icon-btn" aria-label="Close" disabled={busy} onClick={cancelCreate}>
              ×
            </button>
          ) : null}
        >
          <div className="ua-cfg-bn-editor">
            <div className="ua-cfg-bn-meta sceensizmanage">
              <label className="ua-cfg-bn-field">
                <span>Banner type</span>
                <CfgSelect
                  className="ua-cfg-bn-select"
                  ariaLabel="Banner type"
                  placeholder={typeOptions.length ? "Select banner type" : "No banner types"}
                  options={typeOptions}
                  value={editor.type}
                  disabled={busy || !typeOptions.length}
                  onChange={(value) => patch({ type: value })}
                />
              </label>
              <label className="ua-cfg-bn-field">
                <span>
                  Placement
                  <em style={{height:"14px"}} className="ua-cfg-bn-ratio">{placement.ratio}</em>
                </span>
                <CfgSelect
                  className="ua-cfg-bn-select"
                  ariaLabel="Placement"
                  placeholder={placementOptions.length ? "Select placement" : "No placements"}
                  options={placementOptions}
                  value={editor.placement}
                  disabled={busy || !placementOptions.length}
                  onChange={(value) => patch({ placement: value })}
                />
              </label>
            </div>
            {!bannerTypes.length ? (
              <p className="ua-cfg-panel__sub">Add banner types in Configs → Dropdowns first.</p>
            ) : null}

            <div className="ua-cfg-bn-split">
              <span className="ua-cfg-bn-split__icon" aria-hidden="true">🖥</span>
              <div>
                <strong>Split web &amp; mobile</strong>
                <p>
                  {editor.split
                    ? "Separate web and mobile artwork."
                    : "One artwork for both surfaces."}
                </p>
              </div>
              <button
                type="button"
                className={`ua-toggle ua-toggle--sm${editor.split ? " ua-toggle--on" : ""}`}
                aria-pressed={Boolean(editor.split)}
                aria-label={editor.split ? "Use one artwork for web and mobile" : "Split web and mobile artwork"}
                disabled={busy}
                onClick={() => patch({ split: !editor.split })}
              >
                <span className="ua-toggle__knob" />
              </button>
            </div>

            {editor.split ? (
              <div className="ua-cfg-bn-split-drops sceensizmanage">
                <div className="ua-cfg-bn-slot ua-cfg-bn-slot--desktop">
                  <div className="ua-cfg-bn-split-drops__label">
                    <strong className="is-web">WEB <font style={{fontSize: "9px",color:"#94a3b8"}}>1905×640px</font></strong>
                    <span>Desktop · wide crop</span>
                  </div>
                  <DropZone
                    className="ua-cfg-bn-drop--desktop"
                    label="Upload Web"
                    previewUrl={webPreview}
                    onUpload={() => openFilePicker("web")}
                  />
                </div>
                <div className="ua-cfg-bn-slot ua-cfg-bn-slot--mobile">
                  <div className="ua-cfg-bn-split-drops__label">
                    <strong className="is-app">MOBILE <font style={{fontSize: "9px",color:"#94a3b8"}}>1080×480px</font></strong>
                    <span>App · mobile crop</span>
                  </div>
                  <DropZone
                    className="ua-cfg-bn-drop--mobile"
                    label="Upload Mobile"
                    previewUrl={mobileSlotPreview}
                    onUpload={() => openFilePicker("mobile")}
                  />
                </div>
              </div>
            ) : (
              <div className="ua-cfg-bn-slot ua-cfg-bn-slot--shared">
                <div className="ua-cfg-bn-split-drops__label">
                  <strong className="is-web">BANNER <font style={{fontSize: "9px",color:"#94a3b8"}}>1905×640px</font></strong>
                  <span>Shared · {placementChipLabel(placement) || BANNER_DESKTOP_SIZE.label}</span>
                </div>
                <DropZone
                  className="ua-cfg-bn-drop--desktop"
                  label="Upload banner"
                  previewUrl={webPreview || mobileSlotPreview}
                  onUpload={() => openFilePicker("banner")}
                />
              </div>
            )}

            <div style={{display:"none"}} className="ua-cfg-bn-surfaces ua-cfg-bn-editor__surfaces">
              <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--web${editor.webOn !== false ? " is-on" : ""}`}>
                <span>Web {editor.webOn !== false ? "On" : "Off"}</span>
                <button
                  type="button"
                  className={`ua-toggle ua-toggle--sm${editor.webOn !== false ? " ua-toggle--on" : ""}`}
                  aria-pressed={editor.webOn !== false}
                  disabled={busy}
                  onClick={() => patch({ webOn: editor.webOn === false })}
                >
                  <span className="ua-toggle__knob" />
                </button>
              </div>
              <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--app${editor.appOn !== false ? " is-on" : ""}`}>
                <span>App {editor.appOn !== false ? "On" : "Off"}</span>
                <button
                  type="button"
                  className={`ua-toggle ua-toggle--sm${editor.appOn !== false ? " ua-toggle--on" : ""}`}
                  aria-pressed={editor.appOn !== false}
                  disabled={busy}
                  onClick={() => patch({ appOn: editor.appOn === false })}
                >
                  <span className="ua-toggle__knob" />
                </button>
              </div>
            </div>

            <div className="ua-cfg-bn-copy">
              <span>Banner copy</span>
              <CfgSelect
                className="ua-cfg-bn-select"
                ariaLabel="Banner copy"
                placeholder={headlineOptions.length ? "Select headline" : "No headlines"}
                options={headlineOptions}
                value={headlineValue}
                disabled={busy || !headlineOptions.length}
                onChange={(value) => {
                  const copy = headlineOptions.find((row) => row.value === value || row.label === value);
                  patch({
                    headline: copy?.label || value,
                    body: copy?.body || editor.body,
                    cta: copy?.cta || editor.cta,
                  });
                }}
              />
              <input
                className="ua-cfg-bn-input"
                type="text"
                placeholder="Headline"
                value={asCopyString(editor.headline)}
                disabled={busy}
                onChange={(event) => patch({ headline: event.target.value })}
              />
              <textarea
                className="ua-cfg-bn-textarea"
                rows={6}
                placeholder="Banner body copy"
                value={bodyText}
                disabled={busy}
                onChange={(event) => patch({ body: event.target.value })}
              />
              <div className="ua-cfg-bn-copy__row">
                <input
                  className="ua-cfg-bn-input"
                  type="text"
                  value={asCopyString(editor.cta)}
                  disabled={busy}
                  onChange={(event) => patch({ cta: event.target.value })}
                  placeholder="Call to action"
                />
                <input
                  className="ua-cfg-bn-input"
                  type="text"
                  value={asCopyString(editor.ctaLink)}
                  disabled={busy}
                  onChange={(event) => patch({ ctaLink: event.target.value })}
                  placeholder="CTA link · https://…"
                />
              </div>
              <div className="ua-cfg-bn-copy__actions">
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--primary"
                  disabled={busy}
                  onClick={saveEditor}
                >
                  {busy ? "Saving…" : editor.id ? "Save banner" : "Add banner"}
                </button>
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          className="ua-cfg-bn-live-panel"
          title="Live in this placement"
          subtitle={
            loading
              ? "Loading banners…"
              : `${webLiveCount} on website (LIVE + WEB) · ${items.length} total · drag to reorder`
          }
          actions={(
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-bn-add" disabled={busy} onClick={startCreate}>
              + Add banner
            </button>
          )}
        >
          <div ref={liveListRef} className={`ua-cfg-bn-live${loading ? " is-loading" : ""}`}>
            {pagedItems.map((entry, pageIndex) => {
              const index = pageStart + pageIndex;
              const typeLabel = optionLabel(entry.type, typeOptions, BANNER_TYPES);
              const onWebsite = Boolean(entry.shown) && entry.webOn !== false;
              const isDragging = dragId === entry.id;
              const isDragOver = dragOverId === entry.id && dragId !== entry.id;
              return (
              <article
                key={entry.id}
                className={[
                  "ua-cfg-bn-live__row",
                  entry.id === editor.id && !creating ? "is-selected" : "",
                  onWebsite ? "" : "is-off-web",
                  isDragging ? "is-dragging" : "",
                  isDragOver ? "is-drag-over" : "",
                ].filter(Boolean).join(" ")}
                draggable={!busy}
                onDragStart={(event) => {
                  if (busy) {
                    event.preventDefault();
                    return;
                  }
                  // Ignore drags that start on interactive controls
                  const tag = String(event.target?.tagName || "").toLowerCase();
                  if (tag === "button" || tag === "input" || event.target?.closest?.("button")) {
                    event.preventDefault();
                    return;
                  }
                  setDragId(entry.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", entry.id);
                }}
                onDragOver={(event) => {
                  if (!dragId || dragId === entry.id || busy) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (dragOverId !== entry.id) setDragOverId(entry.id);
                }}
                onDragLeave={() => {
                  if (dragOverId === entry.id) setDragOverId(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const fromId = event.dataTransfer.getData("text/plain") || dragId;
                  finishDrag(fromId, entry.id);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDragOverId(null);
                }}
              >
                <span className="ua-cfg-bn-live__handle" title="Drag to reorder" aria-hidden="true">⠿</span>
                <button type="button" className="ua-cfg-bn-live__thumb" onClick={() => selectItem(entry)}>
                  {entry.image || entry.mobileImage ? (
                    <img src={entry.image || entry.mobileImage} alt="" draggable={false} />
                  ) : null}
                </button>
                <div className="ua-cfg-bn-live__copy">
                  <strong className="ua-cfg-bn-live__title">{asCopyString(entry.title)}</strong>
                  <span className="ua-cfg-bn-live__meta">
                    {typeLabel ? <span className="ua-cfg-bn-live__type">{typeLabel}</span> : null}
                    <span className="ua-cfg-bn-live__rank">#{index + 1}</span>
                    {!onWebsite ? <span className="ua-cfg-bn-live__type">Not on website</span> : null}
                  </span>
                </div>
                <div className="ua-cfg-bn-live__actions">
                  <div className="ua-cfg-bn-live__toggles">
                    <LiveToggle
                      label="WEB"
                      on={entry.webOn !== false}
                      disabled={busy}
                      ariaLabel={entry.webOn !== false ? "Hide on web" : "Show on web"}
                      onToggle={() => persistPatch(entry, { webOn: entry.webOn === false })}
                    />
                    <LiveToggle
                      label="APP"
                      on={entry.appOn !== false}
                      disabled={busy}
                      ariaLabel={entry.appOn !== false ? "Hide on app" : "Show on app"}
                      onToggle={() => persistPatch(entry, { appOn: entry.appOn === false })}
                    />
                    <LiveToggle
                      label={entry.shown ? "LIVE" : "HIDDEN"}
                      on={Boolean(entry.shown)}
                      disabled={busy}
                      ariaLabel={entry.shown ? "Hide banner" : "Show banner"}
                      onToggle={() => persistPatch(entry, { shown: !entry.shown })}
                    />
                  </div>
                  <div className="ua-cfg-bn-live__tools">
                    <button type="button" className="ua-cfg-icon-btn" aria-label="Move up" disabled={index === 0 || busy} onClick={() => moveItem(index, -1)}>↑</button>
                    <button type="button" className="ua-cfg-icon-btn" aria-label="Move down" disabled={index === items.length - 1 || busy} onClick={() => moveItem(index, 1)}>↓</button>
                    <button type="button" className="ua-cfg-icon-btn" aria-label={`Delete ${asCopyString(entry.title)}`} disabled={busy} onClick={() => setPendingDelete(entry)}>×</button>
                  </div>
                </div>
              </article>
              );
            })}
            {!loading && !items.length ? <p className="ua-cfg-panel__sub">No banners yet.</p> : null}
          </div>
          <ListPagination
            page={safePage}
            pages={pageCount}
            total={items.length}
            pageSize={BANNER_PAGE_SIZE}
            onPageChange={goToPage}
            label="Banner pagination"
          />
        </Panel>
      </div>

      <Panel
        title="Live preview"
        subtitle={
          webSurfaceOn && appSurfaceOn
            ? "Common asset · renders on both surfaces"
            : webSurfaceOn
              ? "Web only"
              : appSurfaceOn
                ? "App only"
                : "No surfaces enabled"
        }
        actions={<span className="ua-cfg-bn-ratio">{placementChipLabel(placement)}</span>}
      >
        <BannerLivePreview
          webOn={webSurfaceOn}
          appOn={appSurfaceOn}
          webImage={webPreview}
          mobileImage={editor.split ? mobilePreview : (webPreview || mobilePreview)}
          placement={placement}
        />
      </Panel>

      <Panel
        className="ua-cfg-bn-ref-gallery ua-cfg-gl"
        title="Banner gallery"
        subtitle="Images uploaded for banners in this section. Use one in the editor, download, or upload new media. Deleting a library upload does not remove live banners."
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
            placeholder="Search banner media by name"
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
        </div>
        <div className="ua-cfg-mv-gallery__bar">
          <span>
            {galleryLoading && !items.length
              ? "Loading banner gallery…"
              : `${filteredGallery.length} banner image${filteredGallery.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="ua-cfg-mv-gallery__grid">
          {filteredGallery.map((entry) => (
            <article key={entry.id} className="ua-cfg-gl-card">
              <div className="ua-cfg-gl-card__thumb is-image">
                {entry.url ? (
                  <img className="ua-cfg-gl-card__preview" src={entry.url} alt="" />
                ) : (
                  <span className="ua-cfg-gl-card__placeholder">Banner image</span>
                )}
                <span className="ua-cfg-gl-card__badge is-default">
                  {entry.kind || BANNER_MEDIA_CATEGORY}
                </span>
              </div>
              <div className="ua-cfg-gl-card__body">
                <strong>{entry.title || "Untitled"}</strong>
                <span>{entry.owner || "Admin"} · {entry.date || "—"}</span>
                <span>
                  {entry.source === "library"
                    ? `${entry.size || "—"} · ${galleryVersionLabel(entry.versions)}`
                    : "From live banner list"}
                </span>
              </div>
              <div className={`ua-cfg-gl-card__live${entry.live ? " is-live" : ""}`}>
                <span className={`ua-cfg-gl-card__status${entry.live ? " is-live" : ""}`}>
                  {entry.source === "banner"
                    ? (entry.live ? "On banner" : "Hidden")
                    : (entry.live ? "Live" : "Not live")}
                </span>
                {entry.source === "library" ? (
                  <button
                    type="button"
                    className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
                    aria-pressed={Boolean(entry.live)}
                    disabled={galleryBusyId === entry.id}
                    onClick={() => toggleGalleryLive(entry)}
                  >
                    <span className="ua-toggle__knob" />
                  </button>
                ) : null}
              </div>
              <div className="ua-cfg-gl-card__actions">
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
                {entry.source === "library" ? (
                  <button
                    type="button"
                    className="ua-cfg-icon-btn ua-cfg-gl-card__delete"
                    aria-label="Delete"
                    disabled={entry.live || galleryBusyId === entry.id}
                    onClick={() => {
                      if (entry.live) {
                        onToast("Unmark live assets before delete");
                        return;
                      }
                      setPendingMediaDelete(entry);
                    }}
                  >
                    🗑
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          {!galleryLoading && !filteredGallery.length ? (
            <p className="ua-cfg-gl-section__empty">No banner media yet. Upload a banner or use + Upload media.</p>
          ) : null}
        </div>
      </Panel>

      <MediaPickerModal
        open={galleryPickerOpen}
        onClose={() => setGalleryPickerOpen(false)}
        accept="image"
        multiple
        title="Upload banner media"
        uploadCategory={BANNER_MEDIA_CATEGORY}
        libraryCategory={BANNER_MEDIA_CATEGORY}
        cropImages
        cropWidth={BANNER_DESKTOP_SIZE.width}
        cropHeight={BANNER_DESKTOP_SIZE.height}
        sizeHint={BANNER_DESKTOP_SIZE.label}
        onConfirm={(assets) => {
          setBannerMedia((prev) => {
            const map = new Map(prev.map((entry) => [entry.id, entry]));
            for (const asset of assets) map.set(asset.id, asset);
            return Array.from(map.values());
          });
          onToast(`${assets.length} banner image${assets.length === 1 ? "" : "s"} ready`);
          loadBannerGallery();
        }}
      />

      {mediaPickerModal}

      <ImageCropModal
        open={Boolean(cropPending)}
        label={
          cropPending?.kind === "mobile"
            ? "Mobile banner"
            : cropPending?.kind === "banner"
              ? "Banner"
              : "Desktop banner"
        }
        file={cropPending?.file}
        previewUrl={cropPending?.previewUrl || ""}
        busy={busy}
        defaultRatio={`${cropSpec.width}:${cropSpec.height}`}
        originalAspectCss={`${cropSpec.width} / ${cropSpec.height}`}
        originalAspectNumber={cropSpec.width / cropSpec.height}
        cropWidth={cropSpec.width}
        cropHeight={cropSpec.height}
        backdropClassName="ua-cfg-bn-crop-modal"
        onClose={closeCrop}
        onConfirm={confirmCrop}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag="Banner"
        title={`Delete ${asCopyString(pendingDelete?.title) || "this banner"}?`}
        body="This permanently removes the banner and its uploaded images."
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={deleteItem}
      />

      <ConfirmDialog
        open={Boolean(pendingMediaDelete)}
        tag="Banner gallery"
        title={`Delete “${pendingMediaDelete?.title || "this image"}”?`}
        body="This removes the image from the banner gallery only. Live banners are not changed."
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingMediaDelete(null)}
        onConfirm={confirmMediaDelete}
      />
    </div>
  );
}
