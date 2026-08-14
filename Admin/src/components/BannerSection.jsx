import { useEffect, useMemo, useState } from "react";
import {
  BANNER_COPY,
  BANNER_GALLERY_OWNERS,
  BANNER_PLACEMENTS,
  BANNER_TYPES,
  asCopyString,
  bannerCopyForHeadline,
  bannerPlacementById,
} from "../data/bannerConfigData.js";

const CROP_RATIOS = ["Original", "1:1", "4:3", "3:4", "16:9"];

function Panel({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
      <div className="ua-cfg-panel__head">
        <div>
          <h3 className="ua-cfg-panel__title">{title}</h3>
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function UploadConfirmModal({ open, label, onClose, onConfirm }) {
  const [ratio, setRatio] = useState("Original");
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (!open) return undefined;
    setRatio("Original");
    setZoom(100);
    return undefined;
  }, [open]);

  if (!open) return null;

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
            <button
              key={entry}
              type="button"
              className={`ua-cfg-mv-upload-modal__ratio${ratio === entry ? " is-active" : ""}`}
              onClick={() => setRatio(entry)}
            >
              {entry}
            </button>
          ))}
        </div>
        <div className="ua-cfg-mv-upload-modal__crop">
          <div className="ua-cfg-mv-upload-modal__crop-inner ua-cfg-pt-crop" style={{ transform: `scale(${zoom / 100})` }}>
            <span className="ua-cfg-mv-upload-modal__grid" aria-hidden="true" />
          </div>
        </div>
        <div className="ua-cfg-mv-upload-modal__frameworks">
          <span className="ua-cfg-mv-upload-modal__frameworks-label">How it will sit in your frameworks</span>
          <div className="ua-cfg-mv-upload-modal__frameworks-row">
            <div className="ua-cfg-mv-upload-modal__framework ua-cfg-mv-upload-modal__framework--web">
              <span>Web</span>
              <div />
            </div>
            <div className="ua-cfg-mv-upload-modal__framework ua-cfg-mv-upload-modal__framework--app is-active">
              <span>App</span>
              <div />
            </div>
          </div>
        </div>
        <div className="ua-cfg-mv-upload-modal__zoom">
          <button type="button" className="ua-cfg-mv-upload-modal__zoom-btn" onClick={() => setZoom((value) => Math.max(50, value - 10))}>−</button>
          <input type="range" min={50} max={150} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          <button type="button" className="ua-cfg-mv-upload-modal__zoom-btn" onClick={() => setZoom((value) => Math.min(150, value + 10))}>+</button>
          <span className="ua-cfg-mv-upload-modal__zoom-value">{zoom}%</span>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => { setRatio("Original"); setZoom(100); }}>Reset</button>
        </div>
        <div className="ua-cfg-mv-upload-modal__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>Discard</button>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={onConfirm}>Confirm &amp; attach</button>
        </div>
      </div>
    </div>
  );
}

function DropZone({ label, hint, uploaded, onUpload }) {
  return (
    <div className={`ua-cfg-bn-drop${uploaded ? " is-filled" : ""}`}>
      <span className="ua-cfg-bn-drop__icon" aria-hidden="true">{uploaded ? "🖼" : "▢"}</span>
      <p>{uploaded ? "Banner attached" : hint}</p>
      <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={onUpload}>
        {uploaded ? "Replace" : label}
      </button>
    </div>
  );
}

function GalleryPanel({ gallery, setGallery, onToast, onUpload }) {
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("All owners");
  const [selected, setSelected] = useState([]);

  const filtered = useMemo(() => {
    return gallery.filter((entry) => {
      const matchesSearch = entry.title.toLowerCase().includes(search.trim().toLowerCase());
      const matchesOwner = owner === "All owners" || entry.owner === owner;
      return matchesSearch && matchesOwner;
    });
  }, [gallery, owner, search]);

  const selectedLive = selected.some((id) => gallery.find((entry) => entry.id === id)?.live);

  return (
    <Panel
      title="Gallery"
      subtitle="Assets uploaded for this section — filter by owner or date, reuse, download or delete. Live assets must be unmarked first."
      actions={
        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={onUpload}>
          + Upload media
        </button>
      }
    >
      <div className="ua-cfg-mv-gallery__filters">
        <input
          type="search"
          className="ua-cfg-mv-gallery__search"
          placeholder="Search media by name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="ua-cfg-mv-gallery__select" value={owner} onChange={(event) => setOwner(event.target.value)}>
          {BANNER_GALLERY_OWNERS.map((entry) => (
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
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => onToast("Download started")}>
              Download
            </button>
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
              disabled={selectedLive}
              onClick={() => {
                if (selectedLive) {
                  onToast("Unmark live assets first");
                  return;
                }
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
                <span className="ua-cfg-mv-gallery-card__type ua-cfg-bn-badge">Banner</span>
                <span className="ua-cfg-bn-thumb__mark" aria-hidden="true">🖼</span>
                <span className="ua-cfg-gl-card__placeholder">Banner image</span>
              </div>
              <div className="ua-cfg-mv-gallery-card__body">
                <strong>{entry.title}</strong>
                <span>{entry.owner} · {entry.date}</span>
                <span>{entry.size} · {entry.versions} versions</span>
              </div>
              <div className="ua-cfg-mv-gallery-card__live">
                <span className={`ua-cfg-mv-gallery-card__status${entry.live ? " is-live" : ""}`}>
                  {entry.live ? "Live" : "Not live"}
                </span>
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
                <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => onToast("History opened")}>
                  History
                </button>
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
  );
}

export function BannerSection({ editor, setEditor, items, setItems, gallery, setGallery, onToast }) {
  const [uploadKind, setUploadKind] = useState(null);
  const placement = bannerPlacementById(editor.placement);
  const bodyText = asCopyString(editor.body);

  function patch(next) {
    setEditor((prev) => ({ ...prev, ...next }));
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
              onClick={() => patch({ appOn: !editor.appOn })}
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
              onClick={() => patch({ webOn: !editor.webOn })}
            >
              <span className="ua-toggle__knob" />
            </button>
          </div>
        </div>
      </Panel>

      <div className="ua-cfg-bn-layout">
        <div className="ua-cfg-bn-editor">
          <label className="ua-cfg-bn-field">
            <span>Banner type</span>
            <select value={editor.type} onChange={(event) => patch({ type: event.target.value })}>
              {BANNER_TYPES.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.label}</option>
              ))}
            </select>
          </label>

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
                <DropZone label="Upload Web" hint="Web artwork" uploaded={editor.webUploaded} onUpload={() => setUploadKind("web")} />
              </div>
              <div>
                <div className="ua-cfg-bn-split-drops__label">
                  <strong className="is-app">MOBILE</strong>
                  <span>Portrait · app crop</span>
                </div>
                <DropZone label="Upload Mobile" hint="Mobile artwork" uploaded={editor.mobileUploaded} onUpload={() => setUploadKind("mobile")} />
              </div>
            </div>
          ) : null}

          <label className="ua-cfg-bn-field">
            <span>
              Placement
              <em className="ua-cfg-bn-ratio">{placement.ratio}</em>
            </span>
            <select value={editor.placement} onChange={(event) => patch({ placement: event.target.value })}>
              {BANNER_PLACEMENTS.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.label}</option>
              ))}
            </select>
          </label>

          {!editor.split ? (
            <DropZone
              label="Upload banner"
              hint={`Drop banner · ${placement.ratio}`}
              uploaded={editor.uploaded}
              onUpload={() => setUploadKind("banner")}
            />
          ) : null}

          <div className="ua-cfg-bn-copy">
            <span>Banner copy</span>
            <select
              value={editor.headline}
              onChange={(event) => {
                const copy = bannerCopyForHeadline(event.target.value);
                patch({ headline: copy.headline, body: copy.body, cta: copy.cta });
              }}
            >
              {BANNER_COPY.map((entry) => (
                <option key={entry.headline} value={entry.headline}>{entry.headline}</option>
              ))}
            </select>
            <textarea
              rows={4}
              value={bodyText}
              onChange={(event) => patch({ body: event.target.value })}
            />
            <input
              type="text"
              value={typeof editor.cta === "string" ? editor.cta : ""}
              onChange={(event) => patch({ cta: event.target.value })}
              placeholder="Call to action"
            />
            <div className="ua-cfg-bn-copy__actions">
              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={() => setUploadKind("banner")}>
                Upload image
              </button>
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--primary"
                onClick={() => {
                  patch({ uploaded: true });
                  onToast("Banner image replaced");
                }}
              >
                Replace
              </button>
            </div>
          </div>
        </div>

        <Panel title="Live in this placement">
          <div className="ua-cfg-bn-live">
            {items.map((entry, index) => (
              <article key={entry.id} className="ua-cfg-bn-live__row">
                <span className="ua-cfg-bn-live__handle" aria-hidden="true">⠿</span>
                <span className="ua-cfg-bn-live__thumb" aria-hidden="true" />
                <strong>{entry.title}</strong>
                <span className={`ua-cfg-faq__shown${entry.shown ? " is-on" : ""}`}>
                  {entry.shown ? "Shown" : "Hidden"}
                </span>
                <button
                  type="button"
                  className={`ua-toggle ua-toggle--sm${entry.shown ? " ua-toggle--on" : ""}`}
                  aria-pressed={entry.shown}
                  onClick={() => setItems((prev) => prev.map((row) => (row.id === entry.id ? { ...row, shown: !row.shown } : row)))}
                >
                  <span className="ua-toggle__knob" />
                </button>
                <span className="ua-cfg-bn-live__rank">#{index + 1}</span>
                <button type="button" className="ua-cfg-icon-btn" aria-label="Move up" onClick={() => moveItem(index, -1)}>↑</button>
                <button type="button" className="ua-cfg-icon-btn" aria-label="Move down" onClick={() => moveItem(index, 1)}>↓</button>
              </article>
            ))}
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
              <div className={`ua-cfg-bn-preview__banner${editor.uploaded || editor.webUploaded ? " is-on" : ""}`}>BANNER</div>
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
              <div className={`ua-cfg-bn-preview__banner ua-cfg-bn-preview__banner--app${editor.uploaded || editor.mobileUploaded ? " is-on" : ""}`}>BANNER</div>
            </div>
          </div>
        </div>
      </Panel>

      <GalleryPanel
        gallery={gallery}
        setGallery={setGallery}
        onToast={onToast}
        onUpload={() => setUploadKind("gallery")}
      />

      <UploadConfirmModal
        open={Boolean(uploadKind)}
        label="banner"
        onClose={() => setUploadKind(null)}
        onConfirm={() => {
          if (uploadKind === "web") patch({ webUploaded: true });
          else if (uploadKind === "mobile") patch({ mobileUploaded: true });
          else patch({ uploaded: true });
          setUploadKind(null);
          onToast("Banner attached");
        }}
      />
    </div>
  );
}
