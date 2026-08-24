import { useEffect, useMemo, useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";
import { BLOG_GALLERY_OWNERS } from "../data/blogsConfigData.js";

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

function Panel({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
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

function postLabel(index) {
  return index === 0 ? "Featured" : `Post ${index + 1}`;
}

function insertPost(list, post, position) {
  if (position === "featured") return [post, ...list];
  if (position === "2") {
    const next = [...list];
    next.splice(Math.min(1, next.length), 0, post);
    return next;
  }
  if (position === "3") {
    const next = [...list];
    next.splice(Math.min(2, next.length), 0, post);
    return next;
  }
  return [...list, post];
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

function UploadConfirmModal({ open, onClose, onConfirm }) {
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
            <p className="ua-cfg-mv-upload-modal__sub">blogcover · set the crop, ratio and zoom before it is attached</p>
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

function HistoryModal({ entry, kind = "Blog", onClose, onToast }) {
  if (!entry) return null;
  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-rc-history" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="ua-cfg-rc-history__head">
          <div>
            <h3>{asCopyString(entry.title)}</h3>
            <p>{kind} · owned by {asCopyString(entry.owner)} · newest first</p>
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

export function BlogsSection({ editor, setEditor, posts, setPosts, gallery, setGallery, onToast }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploadFor, setUploadFor] = useState(null);
  const [history, setHistory] = useState(null);
  const [draft, setDraft] = useState({ title: "", description: "", cover: false, position: "last" });
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("All owners");
  const [selected, setSelected] = useState([]);

  function patch(next) {
    setEditor((prev) => ({ ...prev, ...next }));
  }

  function updatePost(id, next) {
    setPosts((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...next } : entry)));
  }

  function movePost(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= posts.length) return;
    setPosts((prev) => {
      const copy = [...prev];
      const [row] = copy.splice(index, 1);
      copy.splice(next, 0, row);
      return copy;
    });
  }

  function addPost() {
    const title = asCopyString(draft.title).trim();
    const description = asCopyString(draft.description).trim();
    if (!title || !description) {
      onToast("Add a headline and description");
      return;
    }
    setPosts((prev) => insertPost(prev, {
      id: `bl-${Date.now()}`,
      title,
      description,
      live: true,
      cover: draft.cover,
    }, draft.position));
    setDraft({ title: "", description: "", cover: false, position: "last" });
    setCreating(false);
    onToast("Post added");
  }

  const liveCount = posts.filter((entry) => entry.live).length;
  const filtered = useMemo(() => gallery.filter((entry) => {
    const matchesSearch = asCopyString(entry.title).toLowerCase().includes(search.trim().toLowerCase());
    const matchesOwner = owner === "All owners" || entry.owner === owner;
    return matchesSearch && matchesOwner;
  }), [gallery, owner, search]);
  return (
    <div className="ua-cfg-bl">
      <Panel className="ua-cfg-surface-live" title="Where this is live" subtitle="Turn it on for the app, the website, or both.">
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
        title="Posts"
        subtitle={`Drag to reorder · ${liveCount} of ${posts.length} live`}
        actions={<button type="button" className="ua-cfg-rc-add" onClick={() => setCreating(true)}>+ Add post</button>}
      >
        {creating ? (
          <section className="ua-cfg-rc-new">
            <div className="ua-cfg-rc-new__head">
              <strong><span aria-hidden="true">✎</span> New post</strong>
              <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={() => setCreating(false)}>×</button>
            </div>
            <div className="ua-cfg-rc-new__grid">
              <div className={`ua-cfg-vh-drop ua-cfg-vh-drop--cover${draft.cover ? " is-on" : ""}`}>
                <span aria-hidden="true">🖼</span>
                <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setUploadFor("draft")}>
                  {draft.cover ? "Replace cover" : "Cover image"}
                </button>
              </div>
              <div className="ua-cfg-rc-new__fields">
                <input
                  className="ua-cfg-vh-input"
                  placeholder="Headline · e.g. What your HbA1c really tells you"
                  value={asCopyString(draft.title)}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                />
                <textarea
                  className="ua-cfg-tf-story"
                  rows={3}
                  placeholder="Short description shown under the headline..."
                  value={asCopyString(draft.description)}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <div className="ua-cfg-bl-new-foot">
                <select className="ua-cfg-vh-input ua-cfg-bl-pos" value={draft.position} onChange={(event) => setDraft((prev) => ({ ...prev, position: event.target.value }))}>
                  <option value="featured">Featured (top)</option>
                  <option value="2">Position 2</option>
                  <option value="3">Position 3</option>
                  <option value="last">Last</option>
                </select>
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={addPost}>Add post</button>
              </div>
            </div>
          </section>
        ) : null}

        <div className="ua-cfg-rc-list">
          {posts.map((entry, index) => {
            const editing = editingId === entry.id;
            return (
              <article key={entry.id} className="ua-cfg-rc-item">
                <button type="button" className={`ua-cfg-rc-cover${entry.cover ? " is-on" : ""}`} onClick={() => setUploadFor(entry.id)}>
                  <span aria-hidden="true">🖼</span>
                  <em>Cover</em>
                </button>
                <div className="ua-cfg-rc-item__body">
                  <div className="ua-cfg-rc-item__row">
                    <span className="ua-cfg-bn-live__handle" aria-hidden="true">⠿</span>
                    <span className="ua-cfg-rc-pill ua-cfg-bl-flag">{postLabel(index)}</span>
                    {editing ? (
                      <input className="ua-cfg-vh-input ua-cfg-rc-title" value={asCopyString(entry.title)} onChange={(event) => updatePost(entry.id, { title: event.target.value })} />
                    ) : (
                      <strong>{asCopyString(entry.title)}</strong>
                    )}
                    <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>{entry.live ? "LIVE" : "HIDDEN"}</span>
                    <button type="button" className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`} aria-pressed={entry.live} onClick={() => updatePost(entry.id, { live: !entry.live })}>
                      <span className="ua-toggle__knob" />
                    </button>
                    {editing ? (
                      <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={() => { setEditingId(null); onToast("Post saved"); }}>Save</button>
                    ) : (
                      <button type="button" className="ua-cfg-cr-link ua-cfg-cr-link--modify" onClick={() => setEditingId(entry.id)}>Edit</button>
                    )}
                    <button type="button" className="ua-cfg-icon-btn" aria-label="Move up" disabled={index === 0} onClick={() => movePost(index, -1)}>↑</button>
                    <button type="button" className="ua-cfg-icon-btn" aria-label="Move down" disabled={index === posts.length - 1} onClick={() => movePost(index, 1)}>↓</button>
                    <button type="button" className="ua-cfg-icon-btn" aria-label="Delete" onClick={() => { setPosts((prev) => prev.filter((row) => row.id !== entry.id)); onToast("Post removed"); }}>×</button>
                  </div>
                  {editing ? (
                    <textarea className="ua-cfg-tf-story" rows={2} value={asCopyString(entry.description)} onChange={(event) => updatePost(entry.id, { description: event.target.value })} />
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
        actions={<button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={() => setUploadFor("gallery")}>+ Upload media</button>}
      >
        <div className="ua-cfg-mv-gallery__filters">
          <input type="search" className="ua-cfg-mv-gallery__search" placeholder="Search media by name" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="ua-cfg-mv-gallery__select" value={owner} onChange={(event) => setOwner(event.target.value)}>
            {BLOG_GALLERY_OWNERS.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
          <input type="date" className="ua-cfg-mv-gallery__date" aria-label="From date" />
          <input type="date" className="ua-cfg-mv-gallery__date" aria-label="To date" />
        </div>
        <div className="ua-cfg-mv-gallery__bar">
          <span>{filtered.length} of {gallery.length} items</span>
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
                  <span className="ua-cfg-mv-gallery-card__type ua-cfg-bl-badge">Blog</span>
                  <span className="ua-cfg-bn-thumb__mark" aria-hidden="true">🖼</span>
                  <span className="ua-cfg-gl-card__placeholder">Blog image</span>
                </div>
                <div className="ua-cfg-mv-gallery-card__body">
                  <strong>{asCopyString(entry.title)}</strong>
                  <span>{asCopyString(entry.owner)} · {asCopyString(entry.date)}</span>
                  <span>{asCopyString(entry.size)} · {entry.versions} versions</span>
                </div>
                <div className="ua-cfg-mv-gallery-card__live">
                  <span className={`ua-cfg-mv-gallery-card__status${entry.live ? " is-live" : ""}`}>{entry.live ? "Live" : "Not live"}</span>
                  <button type="button" className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`} aria-pressed={entry.live} onClick={() => setGallery((prev) => prev.map((row) => (row.id === entry.id ? { ...row, live: !row.live } : row)))}>
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
        open={Boolean(uploadFor)}
        onClose={() => setUploadFor(null)}
        onConfirm={() => {
          if (uploadFor === "draft") setDraft((prev) => ({ ...prev, cover: true }));
          else if (uploadFor === "gallery") {
            setGallery((prev) => [
              { id: `bl-g-${Date.now()}`, title: "New blog cover", owner: "Admin", date: "14 Aug 2026", size: "1.2 MB", versions: 1, live: false },
              ...prev,
            ]);
          } else if (uploadFor) updatePost(uploadFor, { cover: true });
          setUploadFor(null);
          onToast("Cover attached");
        }}
      />
      <HistoryModal entry={history} onClose={() => setHistory(null)} onToast={onToast} />
    </div>
  );
}
