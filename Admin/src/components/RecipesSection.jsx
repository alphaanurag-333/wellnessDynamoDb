import { useEffect, useMemo, useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";
import { RECIPE_CATEGORIES, RECIPE_GALLERY_OWNERS } from "../data/recipesConfigData.js";

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

export function RecipesSection({
  editor,
  setEditor,
  items,
  setItems,
  gallery,
  setGallery,
  onToast,
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
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [upload, setUpload] = useState(null);
  const [linkFor, setLinkFor] = useState(null);
  const [draft, setDraft] = useState({
    title: "",
    category: categories[0] || "",
    description: "",
    videoLink: "",
    cover: false,
    video: false,
  });
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("All owners");
  const [selected, setSelected] = useState([]);
  const [history, setHistory] = useState(null);

  function patch(next) {
    setEditor((prev) => ({ ...prev, ...next }));
  }

  function updateItem(id, next) {
    setItems((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...next } : entry)));
  }

  function moveItem(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    setItems((prev) => {
      const copy = [...prev];
      const [row] = copy.splice(index, 1);
      copy.splice(next, 0, row);
      return copy;
    });
  }

  function addItem() {
    const title = asCopyString(draft.title).trim();
    const description = asCopyString(draft.description).trim();
    if (!title || !description) {
      onToast("Add a title and description");
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
    setDraft({ title: "", category: categories[0] || "", description: "", videoLink: "", cover: false, video: false });
    setCreating(false);
    onToast(`${itemNoun} added`);
  }

  const liveCount = items.filter((entry) => entry.live).length;
  const filtered = useMemo(() => {
    return gallery.filter((entry) => {
      const matchesSearch = asCopyString(entry.title).toLowerCase().includes(search.trim().toLowerCase());
      const matchesOwner = owner === "All owners" || entry.owner === owner;
      return matchesSearch && matchesOwner;
    });
  }, [gallery, owner, search]);
  const selectedLive = selected.some((id) => gallery.find((entry) => entry.id === id)?.live);
  const linkTitle = linkFor === "draft" ? "New library item" : asCopyString(items.find((entry) => entry.id === linkFor)?.title);

  return (
    <div className="ua-cfg-rc">
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

      <Panel
        title="Library items"
        subtitle="Admin and Support upload · coaches choose what each client sees."
        actions={
          <button type="button" className="ua-cfg-rc-add" onClick={() => setCreating(true)}>
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
                <div className={`ua-cfg-vh-drop ua-cfg-vh-drop--cover${draft.cover ? " is-on" : ""}`}>
                  <span aria-hidden="true">🖼</span>
                  <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setUpload({ kind: "cover", target: "draft" })}>
                    {draft.cover ? "Replace cover" : "Cover photo"}
                  </button>
                </div>
                <div className={`ua-cfg-vh-drop${draft.video ? " is-on" : ""}`}>
                  <span className="ua-cfg-vh-drop__play" aria-hidden="true">▶</span>
                  <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setUpload({ kind: "video", target: "draft" })}>
                    Upload video
                  </button>
                </div>
              </div>
              <div className="ua-cfg-rc-new__fields">
                <select className="ua-cfg-rc-cat" value={draft.category} onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}>
                  {categories.map((entry) => (
                    <option key={entry} value={entry}>{entry}</option>
                  ))}
                </select>
                <input
                  className="ua-cfg-vh-input"
                  placeholder={titlePlaceholder}
                  value={asCopyString(draft.title)}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                />
                <textarea
                  className="ua-cfg-tf-story"
                  rows={3}
                  placeholder={descriptionPlaceholder}
                  value={asCopyString(draft.description)}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                />
                <input
                  className="ua-cfg-vh-input"
                  placeholder="Or paste a video link · youtube.com/..."
                  value={asCopyString(draft.videoLink)}
                  onChange={(event) => setDraft((prev) => ({ ...prev, videoLink: event.target.value }))}
                />
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={addItem}>Add item</button>
              </div>
            </div>
          </section>
        ) : null}

        <p className="ua-cfg-panel__sub">Drag to reorder · {liveCount} of {items.length} live</p>

        <div className="ua-cfg-rc-list">
          {items.map((entry, index) => {
            const editing = editingId === entry.id;
            return (
              <article key={entry.id} className={`ua-cfg-rc-item${entry.type === "VIDEO" ? " is-video" : " is-text"}`}>
                <div className={`ua-cfg-rc-cover${entry.type === "VIDEO" ? " is-video" : ""}`}>
                  <span aria-hidden="true">▶</span>
                  <em>Cover</em>
                </div>
                <div className="ua-cfg-rc-item__body">
                  <div className="ua-cfg-rc-item__row">
                    <span className="ua-cfg-bn-live__handle" aria-hidden="true">⠿</span>
                    {editing ? (
                      <input
                        className="ua-cfg-vh-input ua-cfg-rc-title"
                        value={asCopyString(entry.title)}
                        onChange={(event) => updateItem(entry.id, { title: event.target.value })}
                      />
                    ) : (
                      <strong>{asCopyString(entry.title)}</strong>
                    )}
                    {editing ? (
                      <select className="ua-cfg-rc-cat" value={asCopyString(entry.category)} onChange={(event) => updateItem(entry.id, { category: event.target.value })}>
                        {categories.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="ua-cfg-rc-pill ua-cfg-rc-pill--cat">{asCopyString(entry.category)}</span>
                    )}
                    <span className={`ua-cfg-rc-pill ua-cfg-rc-pill--${entry.type === "VIDEO" ? "video" : "text"}`}>{entry.type}</span>
                    <em>{asCopyString(entry.duration)}</em>
                    <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>{entry.live ? "LIVE" : "HIDDEN"}</span>
                    <button
                      type="button"
                      className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
                      aria-pressed={entry.live}
                      onClick={() => updateItem(entry.id, { live: !entry.live })}
                    >
                      <span className="ua-toggle__knob" />
                    </button>
                    <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => setUpload({ kind: "video", target: entry.id })}>Video</button>
                    <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => setLinkFor(entry.id)}>Link</button>
                    {editing ? (
                      <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={() => { setEditingId(null); onToast("Recipe saved"); }}>Save</button>
                    ) : (
                      <button type="button" className="ua-cfg-cr-link ua-cfg-cr-link--modify" onClick={() => setEditingId(entry.id)}>Edit</button>
                    )}
                    <button type="button" className="ua-cfg-icon-btn" aria-label="Move up" disabled={index === 0} onClick={() => moveItem(index, -1)}>↑</button>
                    <button type="button" className="ua-cfg-icon-btn" aria-label="Move down" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}>↓</button>
                    <button
                      type="button"
                      className="ua-cfg-icon-btn"
                      aria-label="Delete"
                      onClick={() => {
                        setItems((prev) => prev.filter((row) => row.id !== entry.id));
                        onToast(`${itemNoun} removed`);
                      }}
                    >
                      ×
                    </button>
                  </div>
                  {editing ? (
                    <textarea
                      className="ua-cfg-tf-story"
                      rows={2}
                      value={asCopyString(entry.description)}
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
      </Panel>

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

      <LinkModal
        open={Boolean(linkFor)}
        title={linkTitle}
        onClose={() => setLinkFor(null)}
        onSave={(url) => {
          if (!url) return;
          if (linkFor === "draft") setDraft((prev) => ({ ...prev, videoLink: url, video: true }));
          else updateItem(linkFor, { videoLink: url, type: "VIDEO" });
          setLinkFor(null);
          onToast("Link saved");
        }}
      />

      <HistoryModal entry={history} onClose={() => setHistory(null)} onToast={onToast} />
    </div>
  );
}

function entryDuration(items, id) {
  const entry = items.find((row) => row.id === id);
  if (entry?.type === "VIDEO" && asCopyString(entry.duration).includes(":")) return entry.duration;
  return "2:40";
}
