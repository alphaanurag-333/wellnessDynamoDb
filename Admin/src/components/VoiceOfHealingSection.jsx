import { useEffect, useMemo, useState } from "react";
import { VOICE_GALLERY_OWNERS } from "../data/voiceConfigData.js";

const CROP_RATIOS = ["Original", "1:1", "4:3", "3:4", "16:9"];

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel">
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
            <button key={entry} type="button" className={`ua-cfg-mv-upload-modal__ratio${ratio === entry ? " is-active" : ""}`} onClick={() => setRatio(entry)}>
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
            <div className="ua-cfg-mv-upload-modal__framework ua-cfg-mv-upload-modal__framework--web"><span>Web</span><div /></div>
            <div className="ua-cfg-mv-upload-modal__framework ua-cfg-mv-upload-modal__framework--app is-active"><span>App</span><div /></div>
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

export function VoiceOfHealingSection({
  editor,
  setEditor,
  items,
  setItems,
  gallery,
  setGallery,
  onToast,
}) {
  const [uploadKind, setUploadKind] = useState(null);
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("All owners");
  const [selected, setSelected] = useState([]);

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

  const filtered = useMemo(() => {
    return gallery.filter((entry) => {
      const matchesSearch = entry.title.toLowerCase().includes(search.trim().toLowerCase());
      const matchesOwner = owner === "All owners" || entry.owner === owner;
      return matchesSearch && matchesOwner;
    });
  }, [gallery, owner, search]);

  const selectedLive = selected.some((id) => gallery.find((entry) => entry.id === id)?.live);

  return (
    <div className="ua-cfg-vh">
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

      <div className="ua-cfg-vh-grid">
        <Panel title="Video">
          <div className={`ua-cfg-vh-drop${editor.videoUploaded ? " is-on" : ""}`}>
            <span className="ua-cfg-vh-drop__play" aria-hidden="true">▶</span>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setUploadKind("video")}>
              {editor.videoUploaded ? "Replace video" : "Upload video"}
            </button>
          </div>
          <p className="ua-cfg-vh-or">or</p>
          <input
            type="url"
            className="ua-cfg-vh-input"
            placeholder="Paste a video link (YouTube / Vimeo)"
            value={typeof editor.videoLink === "string" ? editor.videoLink : ""}
            onChange={(event) => patch({ videoLink: event.target.value })}
          />
        </Panel>

        <Panel title="Cover & details">
          <div className={`ua-cfg-vh-drop ua-cfg-vh-drop--cover${editor.coverUploaded ? " is-on" : ""}`}>
            <span className="ua-cfg-vh-drop__play" aria-hidden="true">🖼</span>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setUploadKind("cover")}>
              {editor.coverUploaded ? "Replace cover" : "Upload cover"}
            </button>
          </div>
          <div className="ua-cfg-vh-fields">
            <input
              type="text"
              className="ua-cfg-vh-input"
              placeholder="Client name"
              value={typeof editor.clientName === "string" ? editor.clientName : ""}
              onChange={(event) => patch({ clientName: event.target.value })}
            />
            <input
              type="text"
              className="ua-cfg-vh-input"
              placeholder="Program / product name"
              value={typeof editor.programName === "string" ? editor.programName : ""}
              onChange={(event) => patch({ programName: event.target.value })}
            />
            <label className="ua-cfg-vh-label">Description</label>
            <textarea
              className="ua-cfg-tf-story"
              rows={4}
              placeholder="What this story is about..."
              value={typeof editor.description === "string" ? editor.description : ""}
              onChange={(event) => patch({ description: event.target.value })}
            />
          </div>
        </Panel>
      </div>

      <Panel
        title="Already uploaded"
        subtitle="Drag or use the arrows to set the order they appear in."
        actions={<strong className="ua-cfg-vh-count">{items.length} uploaded</strong>}
      >
        <div className="ua-cfg-bn-live">
          {items.map((entry, index) => (
            <article key={entry.id} className="ua-cfg-bn-live__row ua-cfg-vh-row">
              <span className="ua-cfg-bn-live__handle" aria-hidden="true">⠿</span>
              <em className="ua-cfg-vh-num">{index + 1}</em>
              <span className="ua-cfg-vh-thumb" aria-hidden="true">▶</span>
              <div className="ua-cfg-vh-copy">
                <strong>{entry.title}</strong>
                <p>{entry.duration} · {entry.program}</p>
              </div>
              <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>{entry.live ? "LIVE" : "HIDDEN"}</span>
              <button
                type="button"
                className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
                aria-pressed={entry.live}
                onClick={() => setItems((prev) => prev.map((row) => (row.id === entry.id ? { ...row, live: !row.live } : row)))}
              >
                <span className="ua-toggle__knob" />
              </button>
              <button type="button" className="ua-cfg-icon-btn" aria-label="Move up" onClick={() => moveItem(index, -1)}>↑</button>
              <button type="button" className="ua-cfg-icon-btn" aria-label="Move down" onClick={() => moveItem(index, 1)}>↓</button>
            </article>
          ))}
        </div>
      </Panel>

      <Panel
        title="Gallery"
        subtitle="Assets uploaded for this section — filter by owner or date, reuse, download or delete. Live assets must be unmarked first."
        actions={
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={() => setUploadKind("gallery")}>
            + Upload media
          </button>
        }
      >
        <div className="ua-cfg-mv-gallery__filters">
          <input type="search" className="ua-cfg-mv-gallery__search" placeholder="Search media by name" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="ua-cfg-mv-gallery__select" value={owner} onChange={(event) => setOwner(event.target.value)}>
            {VOICE_GALLERY_OWNERS.map((entry) => (
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
                    <input type="checkbox" checked={isSelected} onChange={() => setSelected((prev) => (prev.includes(entry.id) ? prev.filter((id) => id !== entry.id) : [...prev, entry.id]))} />
                  </label>
                  <span className="ua-cfg-mv-gallery-card__type ua-cfg-tf-badge">Testimonials</span>
                  <span className="ua-cfg-bn-thumb__mark" aria-hidden="true">🖼</span>
                  <span className="ua-cfg-gl-card__placeholder">Testimonials image</span>
                </div>
                <div className="ua-cfg-mv-gallery-card__body">
                  <strong>{entry.title}</strong>
                  <span>{entry.owner} · {entry.date}</span>
                  <span>{entry.size} · {entry.versions} versions</span>
                </div>
                <div className="ua-cfg-mv-gallery-card__live">
                  <span className={`ua-cfg-mv-gallery-card__status${entry.live ? " is-live" : ""}`}>{entry.live ? "Live" : "Not live"}</span>
                  <button type="button" className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`} aria-pressed={entry.live} onClick={() => setGallery((prev) => prev.map((row) => (row.id === entry.id ? { ...row, live: !row.live } : row)))}>
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
        open={Boolean(uploadKind)}
        label={uploadKind === "cover" ? "cover" : uploadKind === "gallery" ? "media" : "video"}
        onClose={() => setUploadKind(null)}
        onConfirm={() => {
          if (uploadKind === "video") patch({ videoUploaded: true });
          else if (uploadKind === "cover") patch({ coverUploaded: true });
          else {
            setGallery((prev) => [
              {
                id: `vh-g-${Date.now()}`,
                title: "New voice of healing asset",
                owner: "Anita Rao",
                date: "14 Aug 2026",
                size: "2.0 MB",
                versions: 1,
                live: false,
              },
              ...prev,
            ]);
          }
          setUploadKind(null);
          onToast("File attached");
        }}
      />
    </div>
  );
}
