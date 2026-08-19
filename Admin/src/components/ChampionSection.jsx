import { useEffect, useMemo, useState } from "react";
import {
  CHAMPION_DESIGNS,
  CHAMPION_GALLERY_OWNERS,
  CHAMPION_POSITIONS,
  CHAMPION_SOURCES,
} from "../data/championConfigData.js";

const CROP_RATIOS = ["Original", "1:1", "4:3", "3:4", "16:9"];

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel">
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

function UploadConfirmModal({ open, onClose, onConfirm }) {
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
            <p className="ua-cfg-mv-upload-modal__sub">champion card · set the crop, ratio and zoom before it is attached</p>
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
        <div className="ua-cfg-mv-upload-modal__zoom">
          <button type="button" className="ua-cfg-mv-upload-modal__zoom-btn" onClick={() => setZoom((v) => Math.max(50, v - 10))}>−</button>
          <input type="range" min={50} max={150} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          <button type="button" className="ua-cfg-mv-upload-modal__zoom-btn" onClick={() => setZoom((v) => Math.min(150, v + 10))}>+</button>
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

function CopyField({ label, hint, value, onChange, max = 40, multiline = false }) {
  const text = typeof value === "string" ? value : "";
  return (
    <label className="ua-cfg-ch-field">
      <span className="ua-cfg-ch-field__meta">
        <strong>{label}</strong>
        <em>{hint}</em>
      </span>
      {multiline ? (
        <textarea rows={3} value={text} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input type="text" maxLength={max} value={text} onChange={(event) => onChange(event.target.value.slice(0, max))} />
      )}
    </label>
  );
}

function PositionPreview({ id }) {
  return (
    <span className={`ua-cfg-ch-pos__art ua-cfg-ch-pos__art--${id}`} aria-hidden="true">
      {id === "none" ? null : <i />}
      <b /><b />
    </span>
  );
}

export function ChampionSection({
  editor,
  setEditor,
  gallery,
  setGallery,
  onToast,
  extraAfterAssets = null,
  designs = CHAMPION_DESIGNS,
  galleryOwners = CHAMPION_GALLERY_OWNERS,
  galleryBadge = "Champion",
  galleryPlaceholder = "Champion card",
  galleryIcon = "🏆",
  sourceName = "champion-photo-source",
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("All owners");
  const [selected, setSelected] = useState([]);

  function patch(next) {
    setEditor((prev) => ({ ...prev, ...next }));
  }

  const filtered = useMemo(() => {
    return gallery.filter((entry) => {
      const matchesSearch = entry.title.toLowerCase().includes(search.trim().toLowerCase());
      const matchesOwner = owner === "All owners" || entry.owner === owner;
      return matchesSearch && matchesOwner;
    });
  }, [gallery, owner, search]);

  const selectedLive = selected.some((id) => gallery.find((entry) => entry.id === id)?.live);
  const showPhotoUi = editor.showPhoto && editor.photoPosition !== "none";

  return (
    <div className="ua-cfg-ch">
      <Panel title="Where this is live" subtitle="Turn it on for the app, the website, or both.">
        <div className="ua-cfg-bn-surfaces">
          <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--app${editor.appOn ? " is-on" : ""}`}>
            <span>App {editor.appOn ? "Enabled" : "Off"}</span>
            <button type="button" className={`ua-toggle ua-toggle--sm${editor.appOn ? " ua-toggle--on" : ""}`} aria-pressed={editor.appOn} onClick={() => patch({ appOn: !editor.appOn })}>
              <span className="ua-toggle__knob" />
            </button>
          </div>
          <div className={`ua-cfg-bn-surface ua-cfg-bn-surface--web${editor.webOn ? " is-on" : ""}`}>
            <span>Web {editor.webOn ? "Enabled" : "Off"}</span>
            <button type="button" className={`ua-toggle ua-toggle--sm${editor.webOn ? " ua-toggle--on" : ""}`} aria-pressed={editor.webOn} onClick={() => patch({ webOn: !editor.webOn })}>
              <span className="ua-toggle__knob" />
            </button>
          </div>
        </div>
      </Panel>

      <Panel title="Add an asset" subtitle="Create, upload, reuse from the gallery, or embed a link.">
        <div className="ua-cfg-ch-actions">
          <button type="button" className="ua-cfg-ch-action ua-cfg-ch-action--create" onClick={() => onToast("New card started")}>+ Create new</button>
          <button type="button" className="ua-cfg-ch-action ua-cfg-ch-action--upload" onClick={() => setUploadOpen(true)}>Upload from device</button>
          <button type="button" className="ua-cfg-ch-action ua-cfg-ch-action--gallery" onClick={() => onToast("Gallery opened")}>Choose from gallery</button>
          <button type="button" className="ua-cfg-ch-action ua-cfg-ch-action--link" onClick={() => onToast("Paste a link to embed")}>Embed link</button>
        </div>
      </Panel>

      {extraAfterAssets}

      <Panel title="Card copy" subtitle="Text printed on the card — edit any line.">
        <CopyField label="Headline" hint="Keep it under 40 characters" value={editor.headline} onChange={(headline) => patch({ headline })} />
        <CopyField label="Sub-line" hint="Keep it under 40 characters" value={editor.subline} onChange={(subline) => patch({ subline })} />
        <CopyField label="Description" hint="Appears under the name on the card" value={editor.description} onChange={(description) => patch({ description })} multiline />
        <CopyField label="Footer / credit" hint="Keep it under 40 characters" value={editor.footer} onChange={(footer) => patch({ footer })} />

        <div className="ua-cfg-ch-photo-toggle">
          <span aria-hidden="true">👤</span>
          <div>
            <strong>Show the client's photo on the card</strong>
            <p>Adds a photo slot to whichever template you pick.</p>
          </div>
          <button
            type="button"
            className={`ua-toggle${editor.showPhoto ? " ua-toggle--on" : ""}`}
            aria-pressed={editor.showPhoto}
            onClick={() => patch({ showPhoto: !editor.showPhoto, photoPosition: editor.showPhoto ? "none" : "top" })}
          >
            <span className="ua-toggle__knob" />
          </button>
        </div>
      </Panel>

      {editor.showPhoto ? (
        <>
          <Panel title="Photo position" subtitle="Where the photo sits inside the card.">
            <div className="ua-cfg-ch-pos">
              {CHAMPION_POSITIONS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`ua-cfg-ch-pos__card${editor.photoPosition === entry.id ? " is-on" : ""}`}
                  onClick={() => patch({ photoPosition: entry.id })}
                >
                  <PositionPreview id={entry.id} />
                  <strong>{entry.label}</strong>
                  <span>{entry.note}</span>
                </button>
              ))}
            </div>
          </Panel>

          {showPhotoUi ? (
            <Panel title="Photo source" subtitle="Where the image comes from when a card is generated.">
              <div className="ua-cfg-ch-source">
                {CHAMPION_SOURCES.map((entry) => (
                  <label key={entry.id} className={`ua-cfg-ch-source__row${editor.photoSource === entry.id ? " is-on" : ""}`}>
                    <input
                      type="radio"
                      name={sourceName}
                      checked={editor.photoSource === entry.id}
                      onChange={() => patch({ photoSource: entry.id })}
                    />
                    <strong>{entry.label}</strong>
                    <span>{entry.note}</span>
                  </label>
                ))}
              </div>
            </Panel>
          ) : null}
        </>
      ) : null}

      <Panel title="Card design" subtitle="Pick a ready-made card, or add your own with the actions above.">
        <div className="ua-cfg-ch-designs">
              {designs.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`ua-cfg-ch-design ua-cfg-ch-design--${entry.id}${editor.design === entry.id ? " is-on" : ""}`}
                  onClick={() => patch({ design: entry.id })}
                >
                  <span aria-hidden="true">{entry.icon}</span>
                  <strong>{entry.label}</strong>
                </button>
              ))}
        </div>
      </Panel>

      <Panel
        title="Gallery"
        subtitle="Assets uploaded for this section — filter by owner or date, reuse, download or delete. Live assets must be unmarked first."
        actions={
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={() => setUploadOpen(true)}>
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
                  <span className="ua-cfg-mv-gallery-card__type ua-cfg-ch-badge">{galleryBadge}</span>
                  <span className="ua-cfg-bn-thumb__mark" aria-hidden="true">{galleryIcon}</span>
                  <span className="ua-cfg-gl-card__placeholder">{galleryPlaceholder}</span>
                </div>
                <div className="ua-cfg-mv-gallery-card__body">
                  <strong>{entry.title}</strong>
                  <span>{entry.owner} · {entry.date}</span>
                  <span>{entry.size} · {entry.versions} versions</span>
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
                  <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => onToast("History opened")}>History</button>
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
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onConfirm={() => {
          setUploadOpen(false);
          onToast("Champion card attached");
        }}
      />
    </div>
  );
}
