import { useMemo, useState } from "react";
import {
  GALLERY_OWNERS,
  MEASUREMENT_GALLERY,
  MEASUREMENT_GUIDE,
  MEASUREMENT_PARAMETERS,
} from "../data/measurementVideoData.js";

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

function LinkModal({ open, title, onClose, onSave }) {
  const [url, setUrl] = useState("");

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
              onSave(url.trim());
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

function UploadConfirmModal({ open, label, onClose, onConfirm }) {
  const [ratio, setRatio] = useState("4:3");
  const [zoom, setZoom] = useState(100);

  if (!open) return null;

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cfg-mv-upload-modal" onClick={(event) => event.stopPropagation()} role="dialog">
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
          <div className="ua-cfg-mv-upload-modal__crop-inner" style={{ transform: `scale(${zoom / 100})` }}>
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
          <input
            type="range"
            min={50}
            max={150}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
          <button type="button" className="ua-cfg-mv-upload-modal__zoom-btn" onClick={() => setZoom((value) => Math.min(150, value + 10))}>+</button>
          <span className="ua-cfg-mv-upload-modal__zoom-value">{zoom}%</span>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setZoom(100)}>Reset</button>
        </div>

        <div className="ua-cfg-mv-upload-modal__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>Discard</button>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={onConfirm}>Confirm &amp; attach</button>
        </div>
      </div>
    </div>
  );
}

function GuidePanel({ guide, onChange, onToast }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: guide.title, description: guide.description });
  const [linkOpen, setLinkOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  function saveEdit() {
    onChange({ ...guide, title: draft.title.trim(), description: draft.description.trim() });
    setEditing(false);
    onToast("Measurement guide saved");
  }

  return (
    <>
      <Panel
        title="Measurement video"
        subtitle="One how-to-measure guide · cover photo, video and description shown in the app. One video only — uploading a new cover or video replaces what is live."
      >
        <div className="ua-cfg-mv-guide">
          <button
            type="button"
            className="ua-cfg-mv-guide__cover"
            onClick={() => setUploadOpen(true)}
          >
            <span className="ua-cfg-mv-guide__cover-icon" aria-hidden="true">▶</span>
            <span>{guide.hasCover ? "Cover" : "Upload cover"}</span>
          </button>

          <div className="ua-cfg-mv-guide__main">
            <div className="ua-cfg-mv-guide__row">
              {editing ? (
                <input
                  type="text"
                  className="ua-cfg-mv-guide__title-input"
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />
              ) : (
                <strong className="ua-cfg-mv-guide__title">{guide.title}</strong>
              )}
              <div className="ua-cfg-mv-guide__badges">
                <span className="ua-cfg-mv-guide__badge ua-cfg-mv-guide__badge--type">
                  {guide.sourceType === "link" ? "LINK" : "VIDEO"}
                </span>
                {guide.sourceType === "video" ? (
                  <span className="ua-cfg-mv-guide__badge">{guide.duration}</span>
                ) : null}
                {guide.live ? <span className="ua-cfg-mv-guide__badge ua-cfg-mv-guide__badge--live">Live</span> : null}
              </div>
              <button
                type="button"
                className={`ua-toggle${guide.live ? " ua-toggle--on" : ""}`}
                aria-pressed={guide.live}
                onClick={() => onChange({ ...guide, live: !guide.live })}
              >
                <span className="ua-toggle__knob" />
              </button>
            </div>

            {editing ? (
              <textarea
                className="ua-cfg-mv-guide__desc-input"
                rows={3}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            ) : (
              <p className="ua-cfg-mv-guide__desc">{guide.description}</p>
            )}

            <div className="ua-cfg-mv-guide__actions">
              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => setUploadOpen(true)}>
                Video
              </button>
              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => setLinkOpen(true)}>
                Link
              </button>
              {editing ? (
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={saveEdit}>
                  Save
                </button>
              ) : (
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--ghost"
                  onClick={() => {
                    setDraft({ title: guide.title, description: guide.description });
                    setEditing(true);
                  }}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </Panel>

      <LinkModal
        open={linkOpen}
        title={guide.title}
        onClose={() => setLinkOpen(false)}
        onSave={(url) => {
          if (!url) {
            onToast("Enter a video link");
            return;
          }
          onChange({ ...guide, sourceType: "link", linkUrl: url, duration: "" });
          setLinkOpen(false);
          onToast("Video link saved");
        }}
      />

      <UploadConfirmModal
        open={uploadOpen}
        label="guide-cover"
        onClose={() => setUploadOpen(false)}
        onConfirm={() => {
          onChange({ ...guide, hasCover: true, sourceType: "video", duration: guide.duration || "3:20" });
          setUploadOpen(false);
          onToast("Cover and video attached");
        }}
      />
    </>
  );
}

function ParametersPanel({ parameters, setParameters, onToast }) {
  const [newName, setNewName] = useState("");
  const [uploadTarget, setUploadTarget] = useState(null);
  const shownCount = parameters.filter((entry) => entry.shown).length;

  function addParameter() {
    const name = newName.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, "-");
    if (parameters.some((entry) => entry.id === id)) {
      onToast("Parameter already exists");
      return;
    }
    setParameters([...parameters, { id, name, shown: true, hasImage: false }]);
    setNewName("");
    onToast(`${name} added`);
  }

  return (
    <>
      <Panel
        title="Internal parameters"
        subtitle="Reference images shown beside each measurement in the app. Images only — nothing else is editable."
        actions={<span className="ua-cfg-mv-params__count">{shownCount} of {parameters.length} shown in the app</span>}
      >
        <div className="ua-cfg-mv-params__add">
          <input
            type="text"
            className="ua-cfg-mv-params__add-input"
            placeholder="Add a parameter · e.g. Calves"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addParameter();
            }}
          />
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={addParameter}>
            + Add parameter
          </button>
        </div>

        <div className="ua-cfg-mv-params__grid">
          {parameters.map((entry) => (
            <article key={entry.id} className="ua-cfg-mv-param-card">
              <button
                type="button"
                className={`ua-cfg-mv-param-card__media${entry.hasImage ? " has-image" : ""}`}
                onClick={() => setUploadTarget(entry.id)}
              >
                <span className="ua-cfg-mv-param-card__icon" aria-hidden="true">🧍</span>
                <span>{entry.hasImage ? "Replace image" : "Upload image"}</span>
              </button>
              <div className="ua-cfg-mv-param-card__foot">
                <span className="ua-cfg-mv-param-card__name">{entry.name}</span>
                <span className={`ua-cfg-mv-param-card__shown${entry.shown ? " is-on" : ""}`}>
                  {entry.shown ? "Shown" : "Hidden"}
                </span>
                <button
                  type="button"
                  className={`ua-toggle ua-toggle--sm${entry.shown ? " ua-toggle--on" : ""}`}
                  aria-pressed={entry.shown}
                  onClick={() => {
                    setParameters(
                      parameters.map((row) =>
                        row.id === entry.id ? { ...row, shown: !row.shown } : row,
                      ),
                    );
                  }}
                >
                  <span className="ua-toggle__knob" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <UploadConfirmModal
        open={Boolean(uploadTarget)}
        label={parameters.find((entry) => entry.id === uploadTarget)?.name ?? "measimg"}
        onClose={() => setUploadTarget(null)}
        onConfirm={() => {
          setParameters(
            parameters.map((row) =>
              row.id === uploadTarget ? { ...row, hasImage: true } : row,
            ),
          );
          setUploadTarget(null);
          onToast("Reference image attached");
        }}
      />
    </>
  );
}

function GalleryPanel({ gallery, setGallery, onToast }) {
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

  function toggleSelect(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]));
  }

  return (
    <Panel
      title="Gallery"
      subtitle="Assets uploaded for this section — filter by owner or date, reuse, download or delete. Live assets must be unmarked first."
      actions={
        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={() => onToast("Upload started")}>
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
          {GALLERY_OWNERS.map((entry) => (
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
            <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => onToast("Deleted selected items")}>
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
              <div className="ua-cfg-mv-gallery-card__thumb">
                <label className="ua-cfg-mv-gallery-card__check">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(entry.id)}
                  />
                </label>
                <span className="ua-cfg-mv-gallery-card__type">Video</span>
                <span className="ua-cfg-mv-gallery-card__play" aria-hidden="true">▶</span>
                <span className="ua-cfg-mv-gallery-card__duration">{entry.duration}</span>
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
                  onClick={() => {
                    setGallery(
                      gallery.map((row) =>
                        row.id === entry.id ? { ...row, live: !row.live } : row,
                      ),
                    );
                  }}
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
                    setGallery(gallery.filter((row) => row.id !== entry.id));
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

export function MeasurementVideoSection({ guide, setGuide, parameters, setParameters, gallery, setGallery, onToast }) {
  return (
    <div className="ua-cfg-mv">
      <GuidePanel guide={guide} onChange={setGuide} onToast={onToast} />
      <ParametersPanel parameters={parameters} setParameters={setParameters} onToast={onToast} />
      <GalleryPanel gallery={gallery} setGallery={setGallery} onToast={onToast} />
    </div>
  );
}

export { MEASUREMENT_GUIDE, MEASUREMENT_PARAMETERS, MEASUREMENT_GALLERY };
