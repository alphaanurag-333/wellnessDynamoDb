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
  BANNER_PLACEMENTS,
  BANNER_TYPES,
  asCopyString,
  bannerPlacementById,
  emptyBannerEditor,
  mapDropdownOptions,
  preserveOption,
} from "../data/bannerConfigData.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { ImageCropModal } from "./ImageCropModal.jsx";
import { CfgSelect } from "./shared.jsx";

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

function DropZone({ label, hint, previewUrl, onUpload }) {
  const uploaded = Boolean(previewUrl);
  return (
    <div className={`ua-cfg-bn-drop${uploaded ? " is-filled" : ""}`}>
      {uploaded ? (
        <img className="ua-cfg-bn-drop__img" src={previewUrl} alt="" />
      ) : (
        <span className="ua-cfg-bn-drop__icon" aria-hidden="true">▢</span>
      )}
      <p>{uploaded ? "Banner attached" : hint}</p>
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

export function BannerSection({ editor, setEditor, items, setItems, onToast }) {
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
  const fileInputRef = useRef(null);
  const cropKindRef = useRef("banner");
  const creatingRef = useRef(false);
  creatingRef.current = creating;

  const bodyText = asCopyString(editor.body);
  const typeOptions = preserveOption(editor.type, bannerTypes, BANNER_TYPES);
  const placementOptions = preserveOption(editor.placement, placements, BANNER_PLACEMENTS);
  const placement = bannerPlacementById(editor.placement, placementOptions);
  const webPreview = editor.imagePreview || editor.image;
  const mobilePreview = editor.mobilePreview || editor.mobileImage || webPreview;
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
    } catch (error) {
      setItems([]);
      onToast(error?.message || "Could not load banners");
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
    fileInputRef.current?.click();
  }

  function onPickFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      onToast("Choose an image file");
      return;
    }
    if (cropPending?.previewUrl) URL.revokeObjectURL(cropPending.previewUrl);
    setCropPending({
      kind: cropKindRef.current,
      file,
      previewUrl: URL.createObjectURL(file),
    });
  }

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
      split: editor.split,
      appOn: editor.appOn,
      webOn: editor.webOn,
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
      onToast("Add a banner image");
      return;
    }
    if (!editor.id && editor.split && !(editor.mobileFile instanceof File) && !editor.mobileImage) {
      onToast("Add a mobile banner image");
      return;
    }
    setBusy(true);
    try {
      if (!editor.id) {
        const created = await adminCreateBanner(null, payload, {
          imageFile: editor.imageFile,
          mobileFile: editor.split ? editor.mobileFile : editor.imageFile,
        });
        setCreating(false);
        onToast("Banner added");
        await loadItems();
        if (created?.id) selectItem(created);
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
      <Panel title="Where this is live" subtitle="Turn it on for the app, the website, or both.">
        <div className="ua-cfg-bn-surfaces">
          <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--app${editor.appOn ? " is-on" : ""}`}>
            <span>App {editor.appOn ? "Enabled" : "Off"}</span>
            <button
              type="button"
              className={`ua-toggle ua-toggle--sm${editor.appOn ? " ua-toggle--on" : ""}`}
              aria-pressed={editor.appOn}
              disabled={busy}
              onClick={() => {
                const appOn = !editor.appOn;
                if (editor.id) persistPatch({ id: editor.id }, { appOn });
                else patch({ appOn });
              }}
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>
          <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--web${editor.webOn ? " is-on" : ""}`}>
            <span>Web {editor.webOn ? "Enabled" : "Off"}</span>
            <button
              type="button"
              className={`ua-toggle ua-toggle--sm${editor.webOn ? " ua-toggle--on" : ""}`}
              aria-pressed={editor.webOn}
              disabled={busy}
              onClick={() => {
                const webOn = !editor.webOn;
                if (editor.id) persistPatch({ id: editor.id }, { webOn });
                else patch({ webOn });
              }}
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>
        </div>
      </Panel>

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
            {!bannerTypes.length ? (
              <p className="ua-cfg-panel__sub">Add banner types in Configs → Dropdowns first.</p>
            ) : null}

            <div className="ua-cfg-bn-split">
              <span className="ua-cfg-bn-split__icon" aria-hidden="true">🖥</span>
              <div>
                <strong>Split web &amp; mobile</strong>
                <p>{editor.split ? "Separate web and mobile artwork." : "One artwork for both surfaces"}</p>
              </div>
              <button
                type="button"
                className={`ua-toggle ua-toggle--sm${editor.split ? " ua-toggle--on" : ""}`}
                aria-pressed={editor.split}
                disabled={busy}
                onClick={() => patch({ split: !editor.split })}
              >
                <span className="ua-toggle__knob" />
              </button>
            </div>

            {editor.split ? (
              <div className="ua-cfg-bn-split-drops">
                <div>
                  <div className="ua-cfg-bn-split-drops__label">
                    <strong className="is-web">WEB</strong>
                    <span>Desktop · wide crop</span>
                  </div>
                  <DropZone label="Upload Web" hint="Web artwork" previewUrl={webPreview} onUpload={() => openFilePicker("web")} />
                </div>
                <div>
                  <div className="ua-cfg-bn-split-drops__label">
                    <strong className="is-app">MOBILE</strong>
                    <span>Portrait · app crop</span>
                  </div>
                  <DropZone label="Upload Mobile" hint="Mobile artwork" previewUrl={mobilePreview} onUpload={() => openFilePicker("mobile")} />
                </div>
              </div>
            ) : null}

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

            {!editor.split ? (
              <DropZone
                label="Upload banner"
                hint={`Drop banner · ${placement.ratio}`}
                previewUrl={webPreview}
                onUpload={() => openFilePicker("banner")}
              />
            ) : null}

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
                <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" disabled={busy} onClick={() => openFilePicker(editor.split ? "web" : "banner")}>
                  Upload image
                </button>
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
          title="Live in this placement"
          subtitle={loading ? "Loading banners…" : `${items.length} banners`}
          actions={(
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-bn-add" disabled={busy} onClick={startCreate}>
              + Add banner
            </button>
          )}
        >
          <div className="ua-cfg-bn-live">
            {items.map((entry, index) => (
              <article key={entry.id} className={`ua-cfg-bn-live__row${entry.id === editor.id && !creating ? " is-selected" : ""}`}>
                <span className="ua-cfg-bn-live__handle" aria-hidden="true">⠿</span>
                <button type="button" className="ua-cfg-bn-live__thumb" onClick={() => selectItem(entry)}>
                  {entry.image || entry.mobileImage ? (
                    <img src={entry.image || entry.mobileImage} alt="" />
                  ) : null}
                </button>
                <strong className="ua-cfg-bn-live__title">{asCopyString(entry.title)}</strong>
                <div className="ua-cfg-bn-live__actions">
                  <span className={`ua-cfg-faq__shown${entry.shown ? " is-on" : ""}`}>
                    {entry.shown ? "LIVE" : "HIDDEN"}
                  </span>
                  <button
                    type="button"
                    className={`ua-toggle ua-toggle--sm${entry.shown ? " ua-toggle--on" : ""}`}
                    aria-pressed={entry.shown}
                    disabled={busy}
                    onClick={() => persistPatch(entry, { shown: !entry.shown })}
                  >
                    <span className="ua-toggle__knob" />
                  </button>
                  <span className="ua-cfg-bn-live__rank">#{index + 1}</span>
                  <button type="button" className="ua-cfg-icon-btn" aria-label="Move up" disabled={index === 0 || busy} onClick={() => moveItem(index, -1)}>↑</button>
                  <button type="button" className="ua-cfg-icon-btn" aria-label="Move down" disabled={index === items.length - 1 || busy} onClick={() => moveItem(index, 1)}>↓</button>
                  <button type="button" className="ua-cfg-icon-btn" aria-label={`Delete ${asCopyString(entry.title)}`} disabled={busy} onClick={() => setPendingDelete(entry)}>×</button>
                </div>
              </article>
            ))}
            {!loading && !items.length ? <p className="ua-cfg-panel__sub">No banners yet.</p> : null}
          </div>
        </Panel>
      </div>

      <Panel
        title="Live preview"
        subtitle={`Common asset · renders on both surfaces · ${placement.ratio}`}
        actions={<span className="ua-cfg-bn-ratio">{placement.label}</span>}
      >
        <div className="ua-cfg-bn-preview">
          <div className="ua-cfg-bn-preview__web">
            <span className="ua-cfg-bn-preview__label is-web">Website</span>
            <div className="ua-cfg-bn-preview__browser">
              <div className="ua-cfg-bn-preview__chrome">
                <span className="ua-cfg-pt-live-preview__brand">IR</span>
                <strong>India Redefining Wellness</strong>
                <em>irwellness.in</em>
              </div>
              <div className={`ua-cfg-bn-preview__banner${webPreview ? " is-on" : ""}`}>
                {webPreview ? <BannerImage src={webPreview} className="ua-cfg-bn-preview__img" /> : "BANNER"}
              </div>
            </div>
          </div>
          <div className="ua-cfg-bn-preview__app">
            <span className="ua-cfg-bn-preview__label is-app">App</span>
            <div className="ua-cfg-bn-preview__phone">
              <div className="ua-cfg-bn-preview__phone-bar">
                <span>9:41</span>
                <strong>Good morning</strong>
                <span aria-hidden="true">🔔</span>
              </div>
              <div className={`ua-cfg-bn-preview__banner ua-cfg-bn-preview__banner--app${mobilePreview ? " is-on" : ""}`}>
                {mobilePreview ? <BannerImage src={mobilePreview} className="ua-cfg-bn-preview__img" /> : "BANNER"}
              </div>
            </div>
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
                <span className="ua-cfg-mv-gallery-card__type ua-cfg-bn-badge">Banner</span>
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

      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onPickFile} />

      <ImageCropModal
        open={Boolean(cropPending)}
        label="banner"
        file={cropPending?.file}
        previewUrl={cropPending?.previewUrl || ""}
        busy={busy}
        defaultRatio="Original"
        originalAspectCss="16 / 9"
        originalAspectNumber={16 / 9}
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
