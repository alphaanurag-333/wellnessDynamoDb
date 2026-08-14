import { useMemo, useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";
import { GOOGLE_REVIEW_GALLERY_OWNERS } from "../data/googleReviewConfigData.js";

const SURFACES = ["web", "app", "both"];

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

function surfaceLabel(surface) {
  if (surface === "web") return "Web";
  if (surface === "app") return "App";
  return "Both";
}

function GalleryPanel({ gallery, setGallery, onToast }) {
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("All owners");
  const [selected, setSelected] = useState([]);

  const filtered = useMemo(() => {
    return gallery.filter((entry) => {
      const matchesSearch = asCopyString(entry.title).toLowerCase().includes(search.trim().toLowerCase());
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
        <button
          type="button"
          className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
          onClick={() => {
            setGallery((prev) => [
              {
                id: `gr-g-${Date.now()}`,
                title: "New social proof asset",
                owner: "Admin",
                date: "14 Aug 2026",
                size: "240 KB",
                versions: 1,
                live: false,
              },
              ...prev,
            ]);
            onToast("Media attached");
          }}
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
          {GOOGLE_REVIEW_GALLERY_OWNERS.map((entry) => (
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
                <span className="ua-cfg-mv-gallery-card__type ua-cfg-gr-badge">Reviews</span>
                <span className="ua-cfg-bn-thumb__mark" aria-hidden="true">★</span>
                <span className="ua-cfg-gl-card__placeholder">Reviews image</span>
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
  );
}

export function GoogleReviewSection({ editor, setEditor, stats, setStats, gallery, setGallery, onToast }) {
  const [creating, setCreating] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const [editingId, setEditingId] = useState(null);

  function patch(next) {
    setEditor((prev) => ({ ...prev, ...next }));
  }

  function updateStat(id, next) {
    setStats((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...next } : entry)));
  }

  function addStat() {
    const label = asCopyString(draftLabel).trim();
    const value = asCopyString(draftValue).trim();
    if (!label || !value) {
      onToast("Add a label and a value");
      return;
    }
    setStats((prev) => [
      ...prev,
      {
        id: `gr-${Date.now()}`,
        label,
        icon: "✦",
        value,
        tone: "accent",
        surface: "both",
        shown: true,
      },
    ]);
    setDraftLabel("");
    setDraftValue("");
    setCreating(false);
    onToast("Stat added");
  }

  return (
    <div className="ua-cfg-gr">
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

      {creating ? (
        <section className="ua-cfg-gr-new">
          <div className="ua-cfg-gr-new__head">
            <strong><span aria-hidden="true">✦</span> New stat</strong>
            <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={() => setCreating(false)}>×</button>
          </div>
          <p>Give it a label and a value — you can set where it is live after adding.</p>
          <div className="ua-cfg-gr-new__row">
            <input
              className="ua-cfg-vh-input"
              placeholder="Label · e.g. Facebook followers"
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
            />
            <input
              className="ua-cfg-vh-input"
              placeholder="Value · e.g. 42.1K"
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
            />
            <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={addStat}>Add stat</button>
          </div>
        </section>
      ) : null}

      <div className="ua-cfg-gr-toolbar">
        <button type="button" className="ua-cfg-gr-create" onClick={() => setCreating(true)}>
          + Create new stat
        </button>
      </div>

      <div className="ua-cfg-gr-grid">
        {stats.map((entry) => {
          const editing = editingId === entry.id;
          return (
            <article key={entry.id} className={`ua-cfg-gr-card ua-cfg-gr-card--${entry.tone}`}>
              <div className="ua-cfg-gr-card__head">
                <span aria-hidden="true">{entry.icon}</span>
                <strong>{asCopyString(entry.label)}</strong>
                {editing ? (
                  <button
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                    onClick={() => {
                      setEditingId(null);
                      onToast("Stat saved");
                    }}
                  >
                    Save
                  </button>
                ) : (
                  <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setEditingId(entry.id)}>
                    Edit
                  </button>
                )}
              </div>
              {editing ? (
                <input
                  className={`ua-cfg-gr-card__input ua-cfg-gr-card__value--${entry.tone}`}
                  value={asCopyString(entry.value)}
                  onChange={(event) => updateStat(entry.id, { value: event.target.value })}
                />
              ) : (
                <p className={`ua-cfg-gr-card__value ua-cfg-gr-card__value--${entry.tone}`}>{asCopyString(entry.value)}</p>
              )}
              <div className="ua-cfg-gr-seg" role="group" aria-label={`${asCopyString(entry.label)} surface`}>
                {SURFACES.map((surface) => (
                  <button
                    key={surface}
                    type="button"
                    className={entry.surface === surface ? "is-on" : ""}
                    onClick={() => updateStat(entry.id, { surface })}
                  >
                    {surfaceLabel(surface)}
                  </button>
                ))}
              </div>
              <div className="ua-cfg-gr-card__shown">
                <span className={entry.shown ? "is-on" : ""}>{entry.shown ? "Shown" : "Hidden"}</span>
                <button
                  type="button"
                  className={`ua-toggle ua-toggle--sm${entry.shown ? " ua-toggle--on" : ""}`}
                  aria-pressed={entry.shown}
                  onClick={() => updateStat(entry.id, { shown: !entry.shown })}
                >
                  <span className="ua-toggle__knob" />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <GalleryPanel gallery={gallery} setGallery={setGallery} onToast={onToast} />
    </div>
  );
}
