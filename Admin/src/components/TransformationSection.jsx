import { useEffect, useMemo, useState } from "react";
import {
  TRANSFORMATION_FIELDS,
  TRANSFORMATION_GALLERY_OWNERS,
} from "../data/transformationConfigData.js";

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

export function TransformationSection({
  editor,
  setEditor,
  points,
  setPoints,
  priority,
  setPriority,
  gallery,
  setGallery,
  onToast,
  onOpenPreview,
}) {
  const [uploadKind, setUploadKind] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("All owners");
  const [selected, setSelected] = useState([]);

  function patch(next) {
    setEditor((prev) => ({ ...prev, ...next }));
  }

  function moveItem(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= priority.length) return;
    setPriority((prev) => {
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
  const usedFields = new Set(points.map((entry) => entry.field));
  const availableFields = TRANSFORMATION_FIELDS.filter((entry) => !usedFields.has(entry.id));

  return (
    <div className="ua-cfg-tf">
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

      <div className="ua-cfg-tf-grid">
        <Panel title="Comparison images" subtitle="Before and after photos for this story.">
          <div className="ua-cfg-tf-photos">
            <div className={`ua-cfg-tf-drop ua-cfg-tf-drop--before${editor.beforeUploaded ? " is-on" : ""}`}>
              <span>Before</span>
              <p>{editor.beforeUploaded ? "Photo attached" : "📷"}</p>
              <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setUploadKind("before")}>
                {editor.beforeUploaded ? "Replace" : "Upload photo"}
              </button>
            </div>
            <div className={`ua-cfg-tf-drop ua-cfg-tf-drop--after${editor.afterUploaded ? " is-on" : ""}`}>
              <span>After</span>
              <p>{editor.afterUploaded ? "Photo attached" : "📷"}</p>
              <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setUploadKind("after")}>
                {editor.afterUploaded ? "Replace" : "Upload photo"}
              </button>
            </div>
          </div>
        </Panel>

        <Panel
          title="Data points"
          subtitle="Pick from the dropdown · values auto-fill, edit any of them."
          actions={
            <div className="ua-cfg-tf-add">
              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => setAddOpen((open) => !open)}>
                + Add data point
              </button>
              {addOpen ? (
                <div className="ua-cfg-tf-add__menu">
                  {availableFields.length ? availableFields.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        setPoints((prev) => [...prev, { id: `tp-${Date.now()}`, field: entry.id, label: entry.label, value: entry.sample, source: "AUTO" }]);
                        setAddOpen(false);
                        onToast(`${entry.label} added`);
                      }}
                    >
                      {entry.label}
                    </button>
                  )) : <span>All fields added</span>}
                </div>
              ) : null}
            </div>
          }
        >
          <div className="ua-cfg-tf-table">
            <div className="ua-cfg-tf-table__head">
              <span>Field</span>
              <span>Value</span>
              <span>Source</span>
              <span />
            </div>
            {points.map((entry) => (
              <div key={entry.id} className="ua-cfg-tf-table__row">
                <span>{entry.label}</span>
                <input
                  type="text"
                  value={entry.value}
                  onChange={(event) => setPoints((prev) => prev.map((row) => (row.id === entry.id ? { ...row, value: event.target.value, source: "EDIT" } : row)))}
                />
                <em>{entry.source}</em>
                <button
                  type="button"
                  className="ua-cfg-icon-btn"
                  aria-label={`Remove ${entry.label}`}
                  onClick={() => setPoints((prev) => prev.filter((row) => row.id !== entry.id))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="ua-cfg-tf-grid">
        <Panel title="Story" subtitle="Shown beside the photos on the website and in the app.">
          <textarea
            className="ua-cfg-tf-story"
            rows={5}
            placeholder="Story / caption shown with the photo..."
            value={typeof editor.story === "string" ? editor.story : ""}
            onChange={(event) => patch({ story: event.target.value })}
          />
        </Panel>
        <Panel
          title="Preview"
          subtitle={editor.appOn || editor.webOn ? "Common asset · renders on both surfaces" : "No surfaces enabled"}
          actions={
            <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={onOpenPreview}>
              Open full &gt;
            </button>
          }
        >
          {editor.appOn || editor.webOn ? (
            <div className="ua-cfg-bn-preview">
              {editor.webOn ? (
                <div className="ua-cfg-bn-preview__web">
                  <span className="ua-cfg-bn-preview__label is-web">Web</span>
                  <div className="ua-cfg-bn-preview__browser">
                    <div className="ua-cfg-bn-preview__chrome">
                      <span className="ua-cfg-pt-live-preview__brand">IR</span>
                      <strong>Transformation</strong>
                      <em>irwellness.in</em>
                    </div>
                    <div className={`ua-cfg-bn-preview__banner ua-cfg-tf-preview-image${editor.afterUploaded || editor.beforeUploaded ? " is-on" : ""}`}>IMAGE</div>
                  </div>
                </div>
              ) : null}
              {editor.appOn ? (
                <div className="ua-cfg-bn-preview__app">
                  <span className="ua-cfg-bn-preview__label is-app">App</span>
                  <div className="ua-cfg-bn-preview__phone">
                    <div className="ua-cfg-bn-preview__phone-bar">
                      <span>9:41</span>
                      <strong>Transformation</strong>
                      <span aria-hidden="true">🔔</span>
                    </div>
                    <div className={`ua-cfg-bn-preview__banner ua-cfg-bn-preview__banner--app ua-cfg-tf-preview-image${editor.afterUploaded || editor.beforeUploaded ? " is-on" : ""}`}>IMAGE</div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="ua-cfg-panel__sub">Turn on App or Web to preview this asset.</p>
          )}
        </Panel>
      </div>

      <Panel title="Priority order" subtitle="Top item appears first.">
        <div className="ua-cfg-bn-live">
          {priority.map((entry, index) => (
            <article key={entry.id} className="ua-cfg-bn-live__row ua-cfg-tf-priority">
              <span className="ua-cfg-bn-live__handle" aria-hidden="true">⠿</span>
              <strong>{index + 1}. {entry.title}</strong>
              <em className="ua-cfg-tf-tag">{entry.program}</em>
              <span className={`ua-cfg-faq__shown${entry.shown ? " is-on" : ""}`}>{entry.shown ? "Shown" : "Hidden"}</span>
              <button
                type="button"
                className={`ua-toggle ua-toggle--sm${entry.shown ? " ua-toggle--on" : ""}`}
                aria-pressed={entry.shown}
                onClick={() => setPriority((prev) => prev.map((row) => (row.id === entry.id ? { ...row, shown: !row.shown } : row)))}
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
            {TRANSFORMATION_GALLERY_OWNERS.map((entry) => (
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
        label={uploadKind === "after" ? "after" : uploadKind === "gallery" ? "gallery" : "before"}
        onClose={() => setUploadKind(null)}
        onConfirm={() => {
          if (uploadKind === "after") patch({ afterUploaded: true });
          else if (uploadKind === "before") patch({ beforeUploaded: true });
          else {
            setGallery((prev) => [
              {
                id: `tf-g-${Date.now()}`,
                title: "New transformation photo",
                owner: "Anita Rao",
                date: "14 Aug 2026",
                size: "1.9 MB",
                versions: 1,
                live: false,
              },
              ...prev,
            ]);
          }
          setUploadKind(null);
          onToast("Photo attached");
        }}
      />
    </div>
  );
}
