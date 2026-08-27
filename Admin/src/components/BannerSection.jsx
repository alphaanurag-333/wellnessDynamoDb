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
  BANNER_COPY,
  BANNER_DESKTOP_SIZE,
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
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";
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
  const [page, setPage] = useState(1);
  const cropKindRef = useRef("banner");
  const creatingRef = useRef(false);
  const liveListRef = useRef(null);
  creatingRef.current = creating;

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

  useEffect(() => () => {
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
  }, [cropPending?.previewUrl]);

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
      const files = kind === "mobile" ? { mobileFile: croppedFile } : { imageFile: croppedFile };
      const saved = await adminUpdateBanner(null, editor.id, {}, files);
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
      split: true,
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
    if (!editor.id && !(editor.imageFile instanceof File) && !editor.image) {
      onToast("Add a desktop banner image");
      return;
    }
    if (!editor.id && !(editor.mobileFile instanceof File) && !editor.mobileImage) {
      onToast("Add a mobile banner image");
      return;
    }
    setBusy(true);
    try {
      if (!editor.id) {
        const created = await adminCreateBanner(null, payload, {
          imageFile: editor.imageFile,
          mobileFile: editor.mobileFile || editor.imageFile,
        });
        setCreating(false);
        onToast("Banner added");
        const next = await loadItems();
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
    if (nextIndex < 0 || nextIndex >= items.length) return;
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

  const gallery = useMemo(() => {
    const rows = [];
    items.forEach((entry) => {
      const title = asCopyString(entry.title);
      const date = entry.updatedAt || entry.createdAt;
      const desktop = String(entry.image || "").trim();
      const mobile = String(entry.mobileImage || "").trim();
      if (desktop) {
        rows.push({
          id: `${entry.id}-desktop`,
          bannerId: entry.id,
          title,
          type: entry.type,
          kind: "Desktop",
          date,
          url: desktop,
        });
      }
      if (mobile && mobile !== desktop) {
        rows.push({
          id: `${entry.id}-mobile`,
          bannerId: entry.id,
          title,
          type: entry.type,
          kind: "Mobile",
          date,
          url: mobile,
        });
      }
    });
    return rows;
  }, [items]);

  const filteredGallery = gallery.filter((entry) => {
    const query = galleryQuery.trim().toLowerCase();
    if (!query) return true;
    return [entry.title, entry.kind, optionLabel(entry.type, typeOptions, BANNER_TYPES)]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

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
            <div className="ua-cfg-bn-meta">
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
                  <em className="ua-cfg-bn-ratio">{placement.ratio}</em>
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

            <div className="ua-cfg-bn-split-drops">
              <div className="ua-cfg-bn-slot ua-cfg-bn-slot--desktop">
                <div className="ua-cfg-bn-split-drops__label">
                  <strong className="is-web">WEB</strong>
                  <span>Desktop - wide crop</span>
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
                  <strong className="is-app">MOBILE</strong>
                  {/* <span>Portrait - app crop</span> */}
                </div>
                <DropZone
                  className="ua-cfg-bn-drop--mobile"
                  label="Upload Mobile"
                  previewUrl={mobileSlotPreview}
                  onUpload={() => openFilePicker("mobile")}
                />
              </div>
            </div>

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
          subtitle={loading ? "Loading banners…" : `${items.length} banner${items.length === 1 ? "" : "s"}`}
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
              return (
              <article key={entry.id} className={`ua-cfg-bn-live__row${entry.id === editor.id && !creating ? " is-selected" : ""}`}>
                <span className="ua-cfg-bn-live__handle" aria-hidden="true">⠿</span>
                <button type="button" className="ua-cfg-bn-live__thumb" onClick={() => selectItem(entry)}>
                  {entry.image || entry.mobileImage ? (
                    <img src={entry.image || entry.mobileImage} alt="" />
                  ) : null}
                </button>
                <div className="ua-cfg-bn-live__copy">
                  <strong className="ua-cfg-bn-live__title">{asCopyString(entry.title)}</strong>
                  <span className="ua-cfg-bn-live__meta">
                    {typeLabel ? <span className="ua-cfg-bn-live__type">{typeLabel}</span> : null}
                    <span className="ua-cfg-bn-live__rank">#{index + 1}</span>
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
          mobileImage={mobilePreview}
          placement={placement}
        />
      </Panel>

      <Panel
        title="Gallery"
        subtitle="Images attached to banners in this section."
      >
        <div className="ua-cfg-mv-gallery__filters">
          <input
            type="search"
            className="ua-cfg-mv-gallery__search"
            placeholder="Search media by name"
            value={galleryQuery}
            onChange={(event) => setGalleryQuery(event.target.value)}
          />
        </div>
        <div className="ua-cfg-mv-gallery__bar">
          <span>{filteredGallery.length} of {gallery.length} items</span>
        </div>
        <div className="ua-cfg-mv-gallery__grid">
          {filteredGallery.map((entry) => (
            <article key={entry.id} className="ua-cfg-mv-gallery-card">
              <div className="ua-cfg-mv-gallery-card__thumb ua-cfg-bn-thumb">
                {entry.url ? (
                  <img src={entry.url} alt="" />
                ) : (
                  <>
                    <span className="ua-cfg-bn-thumb__mark" aria-hidden="true">🖼</span>
                    <span className="ua-cfg-bn-thumb__label">Banner image</span>
                  </>
                )}
                <span className="ua-cfg-mv-gallery-card__type ua-cfg-bn-badge">
                  {entry.kind}
                </span>
              </div>
              <div className="ua-cfg-mv-gallery-card__body">
                <strong>{entry.title || "Untitled banner"}</strong>
                <span>{entry.date ? new Date(entry.date).toLocaleDateString("en-IN") : "—"}</span>
              </div>
              <div className="ua-cfg-bn-gallery__foot">
                <a
                  className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-bn-gallery__open"
                  href={entry.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View
                </a>
                <button
                  type="button"
                  className="ua-cfg-icon-btn"
                  aria-label={`Delete ${entry.title || "banner"}`}
                  disabled={busy}
                  onClick={() => setPendingDelete(items.find((row) => row.id === entry.bannerId))}
                >
                  ×
                </button>
              </div>
            </article>
          ))}
          {!loading && !filteredGallery.length ? <p className="ua-cfg-panel__sub">No banner images yet.</p> : null}
        </div>
      </Panel>

      {mediaPickerModal}

      <ImageCropModal
        open={Boolean(cropPending)}
        label={cropPending?.kind === "mobile" ? "Mobile banner" : "Desktop banner"}
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
    </div>
  );
}
