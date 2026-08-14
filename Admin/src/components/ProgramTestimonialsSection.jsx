import { useEffect, useMemo, useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";
import {
  PROGRAM_TESTIMONIAL_GALLERY_OWNERS,
  PROGRAM_TESTIMONIAL_PROGRAMS,
  programTestimonialLabel,
} from "../data/programTestimonialsConfigData.js";

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
  const hasHead = Boolean(title || subtitle || actions);
  return (
    <section className="ua-cfg-panel">
      {hasHead ? (
        <div className="ua-cfg-panel__head">
          <div>
            {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
            {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
          </div>
          {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function historyRows(entry) {
  const count = Math.max(1, Number(entry.versions) || 1);
  const rows = [
    { badge: "CURRENT", title: "Live version", author: entry.owner, date: entry.date, size: entry.size, current: true },
  ];
  for (let n = count - 1; n >= 1; n -= 1) {
    rows.push({
      badge: `V${n}`,
      title: `Version ${n}`,
      author: n === 1 ? "Vishal Chaurasia" : asCopyString(entry.owner),
      date: n === 1 ? "02 Apr 2026" : "03 May 2026",
      size: entry.size,
      current: false,
    });
  }
  return rows;
}

function UploadConfirmModal({ open, label = "after", onClose, onConfirm }) {
  const [ratio, setRatio] = useState("16:9");
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (!open) return undefined;
    setRatio("16:9");
    setZoom(100);
    return undefined;
  }, [open]);

  if (!open) return null;
  const crop = cropBoxSize(ratio);

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cfg-mv-upload-modal ua-cfg-pt-upload-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="ua-cfg-mv-upload-modal__head">
          <div>
            <h3 className="ua-cfg-mv-upload-modal__title"><span aria-hidden="true">✂</span> Confirm upload</h3>
            <p className="ua-cfg-mv-upload-modal__sub">{label} · set the crop, ratio and zoom before it is attached</p>
          </div>
          <button type="button" className="ua-cfg-mv-upload-modal__close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-mv-upload-modal__ratios">
          {CROP_RATIOS.map((entry) => (
            <button key={entry} type="button" className={`ua-cfg-mv-upload-modal__ratio${ratio === entry ? " is-active" : ""}`} onClick={() => setRatio(entry)}>{entry}</button>
          ))}
        </div>
        <div className="ua-cfg-mv-upload-modal__crop">
          <div className="ua-cfg-mv-upload-modal__crop-inner ua-cfg-pt-crop" style={{ width: crop.width, height: crop.height, transform: `scale(${zoom / 100})` }}>
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
          <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => { setRatio("16:9"); setZoom(100); }}>Reset</button>
        </div>
        <div className="ua-cfg-mv-upload-modal__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>Discard</button>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={onConfirm}>Confirm &amp; attach</button>
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
            <p>Testimonials · owned by {asCopyString(entry.owner)} · newest first</p>
          </div>
          <button type="button" className="ua-cfg-mv-upload-modal__close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        {historyRows(entry).map((row) => (
          <div key={row.badge} className={`ua-cfg-rc-history__row${row.current ? " is-current" : ""}`}>
            <span className={row.current ? "is-current" : "is-old"}>{row.badge}</span>
            <div>
              <strong>{row.title}</strong>
              <p>Uploaded by {asCopyString(row.author)} · {asCopyString(row.date)} · {asCopyString(row.size)}</p>
            </div>
            <div className="ua-cfg-rc-history__actions">
              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => onToast("Download started")}>Download</button>
              {row.current ? null : (
                <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => onToast("Version restored")}>Restore</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoryEditModal({ story, index, liveCount, onClose, onSave }) {
  const [draft, setDraft] = useState({
    program: story.program,
    description: asCopyString(story.description),
  });

  useEffect(() => {
    setDraft({
      program: story.program,
      description: asCopyString(story.description),
    });
  }, [story]);

  return (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div className="ua-cfg-pt-edit-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="ua-cfg-pt-edit-modal__head">
          <div>
            <h3 className="ua-cfg-pt-edit-modal__title">
              <span aria-hidden="true">🌐</span> Live on the website
            </h3>
            <p className="ua-cfg-pt-edit-modal__sub">Edit the copy that shows on the website · {liveCount} live</p>
          </div>
          <button type="button" className="ua-cfg-mv-upload-modal__close" aria-label="Close" onClick={onClose}>×</button>
        </div>

        <div className="ua-cfg-pt-edit-modal__row">
          <strong>#{index + 1} {asCopyString(story.name).trim() || "New story"}</strong>
          <select
            className="ua-cfg-bank-select ua-cfg-bank-select--sm"
            value={draft.program}
            onChange={(event) => setDraft((prev) => ({ ...prev, program: event.target.value }))}
          >
            {PROGRAM_TESTIMONIAL_PROGRAMS.map((program) => (
              <option key={program.id} value={program.id}>{program.label}</option>
            ))}
          </select>
        </div>

        <label className="ua-cfg-pt-field">
          <span className="ua-cfg-pt-field__label">Description</span>
          <textarea
            className="ua-cfg-pt-field__textarea"
            rows={5}
            value={asCopyString(draft.description)}
            placeholder="Story copy shown beside the photos on the website."
            onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
          />
        </label>

        <div className="ua-cfg-mv-upload-modal__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary"
            onClick={() => onSave({
              ...story,
              program: draft.program,
              description: asCopyString(draft.description).trim(),
            })}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function StoryPreviewCard({ story }) {
  if (!story) {
    return <div className="ua-cfg-pt-preview__empty">Select a story to preview it on the program page.</div>;
  }

  return (
    <div className="ua-cfg-pt-preview__browser">
      <div className="ua-cfg-pt-preview__chrome" aria-hidden="true">
        <span /><span /><span />
      </div>
      <div className="ua-cfg-pt-preview__stack">
        <div className={`ua-cfg-pt-preview__hero${story.hasPhoto ? " has-image" : ""}`}>
          {story.hasPhoto ? "" : "Client photo"}
        </div>
        <div className="ua-cfg-pt-preview__copy">
          <strong>{asCopyString(story.headline) || asCopyString(story.name) || "New story"}</strong>
          <p>{asCopyString(story.description) || "Program-specific story…"}</p>
          <span>{programTestimonialLabel(story.program)}</span>
        </div>
      </div>
    </div>
  );
}

export function ProgramTestimonialsSection({ stories, setStories, gallery, setGallery, onToast }) {
  const [selectedId, setSelectedId] = useState(stories[0]?.id ?? null);
  const [uploadFor, setUploadFor] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [history, setHistory] = useState(null);
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("All owners");
  const [selectedMedia, setSelectedMedia] = useState([]);

  const selected = stories.find((entry) => entry.id === selectedId) ?? stories[0] ?? null;
  const liveCount = stories.filter((entry) => entry.live).length;
  const editing = stories.find((entry) => entry.id === editingId) ?? null;
  const editingIndex = stories.findIndex((entry) => entry.id === editingId);

  const filtered = useMemo(() => gallery.filter((entry) => {
    const matchesSearch = asCopyString(entry.title).toLowerCase().includes(search.trim().toLowerCase());
    const matchesOwner = owner === "All owners" || entry.owner === owner;
    return matchesSearch && matchesOwner;
  }), [gallery, owner, search]);

  function updateSelected(patch) {
    if (!selected) return;
    setStories((prev) => prev.map((entry) => (entry.id === selected.id ? { ...entry, ...patch } : entry)));
  }

  function moveItem(id, dir) {
    setStories((prev) => {
      const idx = prev.findIndex((entry) => entry.id === id);
      const nextIdx = idx + dir;
      if (idx < 0 || nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[nextIdx]] = [copy[nextIdx], copy[idx]];
      return copy;
    });
  }

  function addStory() {
    const id = `pt-${Date.now()}`;
    const program = selected?.program || PROGRAM_TESTIMONIAL_PROGRAMS[0].id;
    setStories((prev) => [
      ...prev,
      {
        id,
        name: "New story",
        program,
        headline: "",
        description: "",
        live: true,
        hasPhoto: false,
      },
    ]);
    setSelectedId(id);
    setEditingId(id);
    onToast("Story added");
  }

  return (
    <div className="ua-cfg-pt">
      <Panel title="Program focus" subtitle="The testimonial is shown only on this program's page.">
        <select
          className="ua-cfg-bank-select ua-cfg-pt-program"
          value={selected?.program || PROGRAM_TESTIMONIAL_PROGRAMS[0].id}
          onChange={(event) => updateSelected({ program: event.target.value })}
          disabled={!selected}
        >
          {PROGRAM_TESTIMONIAL_PROGRAMS.map((program) => (
            <option key={program.id} value={program.id}>{program.label}</option>
          ))}
        </select>
      </Panel>

      <Panel>
        {selected ? (
          <div className="ua-cfg-pt-editor">
            <div className="ua-cfg-pt-photo-wrap">
              <span className="ua-cfg-pt-field__label">Photo</span>
              <button type="button" className={`ua-cfg-pt-photo${selected.hasPhoto ? " is-on" : ""}`} onClick={() => setUploadFor("photo")}>
                <span className="ua-cfg-pt-photo__icon" aria-hidden="true">📷</span>
                <strong>Client photo</strong>
                <span className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm">
                  {selected.hasPhoto ? "Replace photo" : "Upload photo"}
                </span>
              </button>
            </div>
            <div className="ua-cfg-pt-fields">
              <label className="ua-cfg-pt-field">
                <span className="ua-cfg-pt-field__label">Headline</span>
                <input
                  type="text"
                  className="ua-cfg-pt-field__input"
                  value={asCopyString(selected.headline)}
                  placeholder="Down 18 kg on Fat Loss"
                  onChange={(event) => updateSelected({ headline: event.target.value })}
                />
              </label>
              <label className="ua-cfg-pt-field">
                <span className="ua-cfg-pt-field__label">Description</span>
                <textarea
                  className="ua-cfg-pt-field__textarea"
                  rows={5}
                  value={asCopyString(selected.description)}
                  placeholder="Program-specific story..."
                  onChange={(event) => updateSelected({ description: event.target.value })}
                />
              </label>
            </div>
          </div>
        ) : (
          <p className="ua-cfg-pt-preview__empty">Add a story to start editing.</p>
        )}
      </Panel>

      <Panel
        title="Preview"
        subtitle="How this story appears on the website."
        actions={<span className="ua-cfg-pt-web-chip">Web</span>}
      >
        <StoryPreviewCard story={selected} />
      </Panel>

      <Panel
        title="Live on the website"
        subtitle="Drag to reorder · toggle to hide without deleting."
        actions={<button type="button" className="ua-cfg-rc-add" onClick={addStory}>+ Add story</button>}
      >
        <div className="ua-cfg-pt-list">
          {stories.map((entry, index) => (
            <div key={entry.id} className={`ua-cfg-pt-row${entry.id === selected?.id ? " is-selected" : ""}`}>
              <span className="ua-cfg-faq__drag" aria-hidden="true">⠿</span>
              <button
                type="button"
                className="ua-cfg-pt-row__main"
                onClick={() => {
                  setSelectedId(entry.id);
                  setEditingId(entry.id);
                }}
              >
                <span className="ua-cfg-faq__num">#{index + 1}</span>
                <strong>{asCopyString(entry.name).trim() || "New story"}</strong>
                <span className="ua-cfg-pt-row__tag">{programTestimonialLabel(entry.program)}</span>
              </button>
              <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>{entry.live ? "LIVE" : "HIDDEN"}</span>
              <button
                type="button"
                className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
                aria-pressed={entry.live}
                aria-label={`${asCopyString(entry.name)} ${entry.live ? "on" : "off"}`}
                onClick={() => {
                  setStories((prev) => prev.map((row) => (row.id === entry.id ? { ...row, live: !row.live } : row)));
                }}
              >
                <span className="ua-toggle__knob" />
              </button>
              <button type="button" className="ua-cfg-icon-btn" aria-label="Move up" disabled={index === 0} onClick={() => moveItem(entry.id, -1)}>↑</button>
              <button type="button" className="ua-cfg-icon-btn" aria-label="Move down" disabled={index === stories.length - 1} onClick={() => moveItem(entry.id, 1)}>↓</button>
              <button
                type="button"
                className="ua-cfg-icon-btn"
                aria-label={`Remove ${asCopyString(entry.name)}`}
                onClick={() => {
                  setStories((prev) => prev.filter((row) => row.id !== entry.id));
                  if (selectedId === entry.id) {
                    const next = stories.find((row) => row.id !== entry.id);
                    setSelectedId(next?.id ?? null);
                  }
                  if (editingId === entry.id) setEditingId(null);
                  onToast("Story removed");
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Gallery"
        subtitle="Assets uploaded for this section — filter by owner or date, reuse, download or delete. Live assets must be unmarked first."
        actions={<button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={() => setUploadFor("gallery")}>+ Upload media</button>}
      >
        <div className="ua-cfg-mv-gallery__filters">
          <input type="search" className="ua-cfg-mv-gallery__search" placeholder="Search media by name" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="ua-cfg-mv-gallery__select" value={owner} onChange={(event) => setOwner(event.target.value)}>
            {PROGRAM_TESTIMONIAL_GALLERY_OWNERS.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
          <input type="date" className="ua-cfg-mv-gallery__date" aria-label="From date" />
          <input type="date" className="ua-cfg-mv-gallery__date" aria-label="To date" />
        </div>
        <div className="ua-cfg-mv-gallery__bar">
          <span>{filtered.length} of {gallery.length} items</span>
        </div>
        <div className="ua-cfg-mv-gallery__grid">
          {filtered.map((entry) => {
            const isSelected = selectedMedia.includes(entry.id);
            return (
              <article key={entry.id} className={`ua-cfg-mv-gallery-card${isSelected ? " is-selected" : ""}`}>
                <div className="ua-cfg-mv-gallery-card__thumb ua-cfg-pt-gallery-thumb">
                  <label className="ua-cfg-mv-gallery-card__check">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => setSelectedMedia((prev) => (prev.includes(entry.id) ? prev.filter((id) => id !== entry.id) : [...prev, entry.id]))}
                    />
                  </label>
                  <span className="ua-cfg-mv-gallery-card__type ua-cfg-pt-gallery-type">Testimonials</span>
                  <span className="ua-cfg-mv-gallery-card__play" aria-hidden="true">🖼</span>
                  <span className="ua-cfg-gl-card__placeholder">Testimonials image</span>
                </div>
                <div className="ua-cfg-mv-gallery-card__body">
                  <strong>{asCopyString(entry.title)}</strong>
                  <span>{asCopyString(entry.owner)} · {asCopyString(entry.date)}</span>
                  <span>{asCopyString(entry.size)} · {entry.versions} {entry.versions === 1 ? "version" : "versions"}</span>
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
                      setSelectedMedia((prev) => prev.filter((id) => id !== entry.id));
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
        open={Boolean(uploadFor)}
        label="after"
        onClose={() => setUploadFor(null)}
        onConfirm={() => {
          if (uploadFor === "photo") updateSelected({ hasPhoto: true });
          else if (uploadFor === "gallery") {
            setGallery((prev) => [
              { id: `pt-g-${Date.now()}`, title: "New testimonial photo", owner: "Admin", date: "14 Aug 2026", size: "1.2 MB", versions: 1, live: false },
              ...prev,
            ]);
          }
          setUploadFor(null);
          onToast("Photo attached");
        }}
      />
      <HistoryModal entry={history} onClose={() => setHistory(null)} onToast={onToast} />
      {editing ? (
        <StoryEditModal
          story={editing}
          index={editingIndex}
          liveCount={liveCount}
          onClose={() => setEditingId(null)}
          onSave={(next) => {
            setStories((prev) => prev.map((row) => (row.id === next.id ? next : row)));
            setEditingId(null);
            onToast("Story saved");
          }}
        />
      ) : null}
    </div>
  );
}
