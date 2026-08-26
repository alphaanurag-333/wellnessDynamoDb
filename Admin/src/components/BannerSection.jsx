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
  preserveOption,
} from "../data/bannerConfigData.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";
import { SectionSurfacePanel } from "./SectionSurfacePanel.jsx";
import { CfgSelect, ListPagination } from "./shared.jsx";
import { useMediaPicker } from "./useMediaPicker.jsx";

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

function DropZone({ label, hint, size, previewUrl, onUpload, className = "" }) {
  const uploaded = Boolean(previewUrl);
  return (
    <div className={`ua-cfg-bn-drop${uploaded ? " is-filled" : ""}${className ? ` ${className}` : ""}`}>
      {uploaded ? (
        <img className="ua-cfg-bn-drop__img" src={previewUrl} alt="" />
      ) : (
        <span className="ua-cfg-bn-drop__icon" aria-hidden="true">▢</span>
      )}
      <p>{uploaded ? "Banner attached" : hint}</p>
      {size ? <span className="ua-cfg-bn-drop__size">{size}</span> : null}
      <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={onUpload}>
        {uploaded ? "Replace" : label}
      </button>
    </div>
  );
}

function BannerImage({ src, className }) {
  if (!src) return null;
  return <img className={className} src={src} alt="" />;
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
  const selectedTypeLabel = optionLabel(editor.type, typeOptions, BANNER_TYPES);
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
      const result = await adminListBanners(null, { page: 1, limit: 100 });
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

  const gallery = useMemo(() => (
    items.map((entry) => ({
      id: entry.id,
      title: entry.title,
      type: entry.type,
      date: entry.updatedAt || entry.createdAt,
      url: entry.image || entry.mobileImage,
      live: entry.shown,
    })).filter((entry) => entry.url)
  ), [items]);

  const filteredGallery = gallery.filter((entry) => (
    entry.title.toLowerCase().includes(galleryQuery.trim().toLowerCase())
  ));

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
            <label className="ua-cfg-bn-field">
              <span>
                Banner type
                {selectedTypeLabel ? (
                  <em className="ua-cfg-bn-ratio">{selectedTypeLabel}</em>
                ) : null}
              </span>
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
            {!bannerTypes.length ? (
              <p className="ua-cfg-panel__sub">Add banner types in Configs → Dropdowns first.</p>
            ) : null}

            <div className="ua-cfg-bn-split-drops">
              <div>
                <div className="ua-cfg-bn-split-drops__label">
                  <strong className="is-web">DESKTOP</strong>
                  <span>Desktop banner image · {BANNER_DESKTOP_SIZE.label}</span>
                </div>
                <DropZone
                  className="ua-cfg-bn-drop--desktop"
                  label="Upload desktop"
                  hint="Desktop banner image"
                  size={BANNER_DESKTOP_SIZE.label}
                  previewUrl={webPreview}
                  onUpload={() => openFilePicker("web")}
                />
              </div>
              <div>
                <div className="ua-cfg-bn-split-drops__label">
                  <strong className="is-app">MOBILE</strong>
                  <span>Mobile banner image · {BANNER_MOBILE_SIZE.label}</span>
                </div>
                <DropZone
                  className="ua-cfg-bn-drop--mobile"
                  label="Upload mobile"
                  hint="Mobile banner image"
                  size={BANNER_MOBILE_SIZE.label}
                  previewUrl={mobileSlotPreview}
                  onUpload={() => openFilePicker("mobile")}
                />
              </div>
            </div>

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

            <div className="ua-cfg-bn-surfaces ua-cfg-bn-editor__surfaces">
              <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--web${editor.webOn !== false ? " is-on" : ""}`}>
                <span>Web {editor.webOn !== false ? "Enabled" : "Disabled"}</span>
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
                <span>App {editor.appOn !== false ? "Enabled" : "Disabled"}</span>
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
                rows={4}
                placeholder="Banner body copy"
                value={bodyText}
                disabled={busy}
                onChange={(event) => patch({ body: event.target.value })}
              />
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
                  {typeLabel ? <span className="ua-cfg-bn-live__type">{typeLabel}</span> : null}
                </div>
                <div className="ua-cfg-bn-live__actions">
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
                  <span className="ua-cfg-bn-live__rank">#{index + 1}</span>
                  <button type="button" className="ua-cfg-icon-btn" aria-label="Move up" disabled={index === 0 || busy} onClick={() => moveItem(index, -1)}>↑</button>
                  <button type="button" className="ua-cfg-icon-btn" aria-label="Move down" disabled={index === items.length - 1 || busy} onClick={() => moveItem(index, 1)}>↓</button>
                  <button type="button" className="ua-cfg-icon-btn" aria-label={`Delete ${asCopyString(entry.title)}`} disabled={busy} onClick={() => setPendingDelete(entry)}>×</button>
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
        subtitle={`Desktop ${BANNER_DESKTOP_SIZE.label} · Mobile ${BANNER_MOBILE_SIZE.label}`}
        actions={<span className="ua-cfg-bn-ratio">{placement.label}</span>}
      >
        <div className="ua-cfg-bn-preview">
          <div className="ua-cfg-bn-preview__web">
            <span className="ua-cfg-bn-preview__label is-web">Website</span>
            {webSurfaceOn ? (
              <div className="ua-cfg-bn-preview__browser">
                <div className="ua-cfg-bn-preview__chrome">
                  <span className="ua-cfg-pt-live-preview__brand">IR</span>
                  <strong>India Redefining Wellness</strong>
                  <em>irwellness.in</em>
                </div>
                <div
                  className={`ua-cfg-bn-preview__banner${webPreview ? " is-on" : ""}`}
                  style={{ aspectRatio: `${BANNER_DESKTOP_SIZE.width} / ${BANNER_DESKTOP_SIZE.height}` }}
                >
                  {webPreview ? <BannerImage src={webPreview} className="ua-cfg-bn-preview__img" /> : "BANNER"}
                </div>
              </div>
            ) : (
              <p className="ua-cfg-panel__sub">Disabled on web.</p>
            )}
          </div>
          <div className="ua-cfg-bn-preview__app">
            <span className="ua-cfg-bn-preview__label is-app">App</span>
            {appSurfaceOn ? (
              <div className="ua-cfg-bn-preview__phone">
                <div className="ua-cfg-bn-preview__phone-bar">
                  <span>9:41</span>
                  <strong>Good morning</strong>
                  <span aria-hidden="true">🔔</span>
                </div>
                <div
                  className={`ua-cfg-bn-preview__banner ua-cfg-bn-preview__banner--app${mobilePreview ? " is-on" : ""}`}
                  style={{ aspectRatio: `${BANNER_MOBILE_SIZE.width} / ${BANNER_MOBILE_SIZE.height}` }}
                >
                  {mobilePreview ? <BannerImage src={mobilePreview} className="ua-cfg-bn-preview__img" /> : "BANNER"}
                </div>
              </div>
            ) : (
              <p className="ua-cfg-panel__sub">Disabled on app.</p>
            )}
          </div>
        </div>
      </Panel>

      <Panel
        title="Gallery"
        subtitle="Images attached to banners in this section. Live banners must be unmarked first."
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
                {entry.url ? <img src={entry.url} alt="" /> : <span className="ua-cfg-bn-thumb__mark" aria-hidden="true">🖼</span>}
                <span className="ua-cfg-mv-gallery-card__type ua-cfg-bn-badge">
                  {optionLabel(entry.type, typeOptions, BANNER_TYPES) || "Banner"}
                </span>
              </div>
              <div className="ua-cfg-mv-gallery-card__body">
                <strong>{asCopyString(entry.title)}</strong>
                <span>{entry.date ? new Date(entry.date).toLocaleDateString("en-IN") : "—"}</span>
              </div>
              <div className="ua-cfg-bn-gallery__foot">
                <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>
                  {entry.live ? "LIVE" : "HIDDEN"}
                </span>
                <button
                  type="button"
                  className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
                  aria-pressed={entry.live}
                  disabled={busy}
                  onClick={() => persistPatch({ id: entry.id }, { shown: !entry.live })}
                >
                  <span className="ua-toggle__knob" />
                </button>
                <a
                  className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-bn-gallery__open"
                  href={entry.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
                <button
                  type="button"
                  className="ua-cfg-icon-btn"
                  aria-label="Delete"
                  disabled={entry.live || busy}
                  onClick={() => setPendingDelete(items.find((row) => row.id === entry.id))}
                >
                  ×
                </button>
              </div>
            </article>
          ))}
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
