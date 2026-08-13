import { useMemo, useState } from "react";
import {
  GALLERY_IMAGE_PREVIEWS,
  GALLERY_MEDIA,
  GALLERY_OWNERS,
  GALLERY_TABS,
  GALLERY_VIDEO_CATALOG,
  galleryCategoryClass,
  galleryVersionLabel,
} from "../data/galleryData.js";

function Panel({ title, subtitle, actions, children, className = "" }) {
  const hasHead = Boolean(title || subtitle || actions);
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
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

function MediaThumb({ entry }) {
  if (entry.type === "audio") {
    return (
      <>
        <span className={`ua-cfg-gl-card__badge is-${galleryCategoryClass(entry.category)}`}>
          Audio
        </span>
        <span className="ua-cfg-gl-card__icon" aria-hidden="true">♪</span>
        <span className="ua-cfg-gl-card__duration">{entry.duration}</span>
      </>
    );
  }

  if (entry.type === "video") {
    return (
      <>
        <span className={`ua-cfg-gl-card__badge is-${galleryCategoryClass(entry.category)}`}>
          Video
        </span>
        <span className="ua-cfg-gl-card__icon" aria-hidden="true">▶</span>
        <span className="ua-cfg-gl-card__duration">{entry.duration}</span>
      </>
    );
  }

  return (
    <>
      <span className={`ua-cfg-gl-card__badge is-${galleryCategoryClass(entry.category)}`}>
        {entry.category}
      </span>
      <span className="ua-cfg-gl-card__icon" aria-hidden="true">🖼</span>
      <span className="ua-cfg-gl-card__placeholder">{entry.category} image</span>
    </>
  );
}

export function GallerySection({ media, setMedia, onToast }) {
  const [activeTab, setActiveTab] = useState("client");
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("All owners");
  const [selected, setSelected] = useState([]);

  const filtered = useMemo(() => {
    return media.filter((entry) => {
      const matchesSearch = entry.title.toLowerCase().includes(search.trim().toLowerCase());
      const matchesOwner = owner === "All owners" || entry.owner === owner;
      return matchesSearch && matchesOwner;
    });
  }, [media, owner, search]);

  function toggleSelect(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]));
  }

  function toggleLive(id) {
    setMedia(media.map((entry) => (entry.id === id ? { ...entry, live: !entry.live } : entry)));
  }

  function deleteItem(id) {
    setMedia(media.filter((entry) => entry.id !== id));
    setSelected((prev) => prev.filter((entry) => entry !== id));
    onToast("Asset deleted");
  }

  return (
    <>
      <Panel
        className="ua-cfg-gl"
        title="Gallery"
        subtitle="Admin-only view of every client upload plus common assets."
      >
        <div className="ua-cfg-gl-tabs" role="tablist">
          {GALLERY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`ua-cfg-gl-tabs__tab${activeTab === tab.id ? " is-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label} · {tab.count.toLocaleString("en-IN")}
            </button>
          ))}
        </div>

        <div className="ua-cfg-gl-section">
          <h4 className="ua-cfg-gl-section__title">Videos</h4>
          <p className="ua-cfg-gl-section__sub">
            Every video in the Gallery and the onboarding tag it currently carries.
          </p>
          <div className="ua-cfg-gl-videos">
            {GALLERY_VIDEO_CATALOG.map((entry) => (
              <article key={entry.id} className="ua-cfg-gl-video">
                <div className="ua-cfg-gl-video__thumb">
                  <span aria-hidden="true">▶</span>
                </div>
                <strong>{entry.title}</strong>
                <div className="ua-cfg-gl-video__meta">
                  <span className={`ua-cfg-gl-video__tag${entry.tag === "Untagged" ? " is-muted" : ""}`}>
                    {entry.tag}
                  </span>
                  <span>{entry.duration}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="ua-cfg-gl-section">
          <h4 className="ua-cfg-gl-section__title">Images</h4>
          <div className="ua-cfg-gl-images">
            {GALLERY_IMAGE_PREVIEWS.map((entry) => (
              <article key={entry.id} className="ua-cfg-gl-image">
                <div className="ua-cfg-gl-image__thumb" aria-hidden="true">🖼</div>
                <strong>{entry.title}</strong>
                <span>{entry.subtitle}</span>
              </article>
            ))}
          </div>
        </div>
      </Panel>

      <Panel
        title="Gallery"
        subtitle="Assets uploaded for this section — filter by owner or date, reuse, download or delete. Live assets must be unmarked first."
        actions={
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
            onClick={() => onToast("Upload started")}
          >
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
          <span>{filtered.length} of {media.length} items</span>
          {selected.length ? (
            <div className="ua-cfg-mv-gallery__selection">
              <span>{selected.length} selected</span>
              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => onToast("Download started")}>
                Download
              </button>
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
                onClick={() => {
                  setMedia(media.filter((entry) => !selected.includes(entry.id)));
                  setSelected([]);
                  onToast("Deleted selected items");
                }}
              >
                Delete
              </button>
              <button type="button" className="ua-cfg-icon-btn" aria-label="Clear selection" onClick={() => setSelected([])}>
                ×
              </button>
            </div>
          ) : null}
        </div>

        <div className="ua-cfg-mv-gallery__grid">
          {filtered.map((entry) => {
            const isSelected = selected.includes(entry.id);
            return (
              <article key={entry.id} className={`ua-cfg-gl-card${isSelected ? " is-selected" : ""}`}>
                <div className={`ua-cfg-gl-card__thumb is-${entry.type}`}>
                  <label className="ua-cfg-gl-card__check">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(entry.id)}
                    />
                  </label>
                  <MediaThumb entry={entry} />
                </div>
                <div className="ua-cfg-gl-card__body">
                  <strong>{entry.title}</strong>
                  <span>{entry.owner} · {entry.date}</span>
                  <span>{entry.size} · {galleryVersionLabel(entry.versions)}</span>
                </div>
                <div className={`ua-cfg-gl-card__live${entry.live ? " is-live" : ""}`}>
                  <span className={`ua-cfg-gl-card__status${entry.live ? " is-live" : ""}`}>
                    {entry.live ? "Live" : "Not live"}
                  </span>
                  <button
                    type="button"
                    className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
                    aria-pressed={entry.live}
                    onClick={() => toggleLive(entry.id)}
                  >
                    <span className="ua-toggle__knob" />
                  </button>
                </div>
                <div className="ua-cfg-gl-card__actions">
                  <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => onToast("History opened")}>
                    History
                  </button>
                  <button type="button" className="ua-cfg-icon-btn ua-cfg-gl-card__download" aria-label="Download" onClick={() => onToast("Download started")}>
                    ↓
                  </button>
                  <button
                    type="button"
                    className="ua-cfg-icon-btn ua-cfg-gl-card__delete"
                    aria-label="Delete"
                    disabled={entry.live}
                    onClick={() => deleteItem(entry.id)}
                  >
                    🗑
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </Panel>
    </>
  );
}

export { GALLERY_MEDIA } from "../data/galleryData.js";
