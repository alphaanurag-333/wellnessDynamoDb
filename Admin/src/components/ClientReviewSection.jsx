import { useEffect, useMemo, useState } from "react";
import {
  CLIENT_REVIEW_GALLERY_OWNERS,
  CLIENT_REVIEW_PROGRAMS,
} from "../data/clientReviewConfigData.js";
import { asCopyString } from "../data/bannerConfigData.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { CfgSelect } from "./shared.jsx";

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

function Stars({ count = 5 }) {
  const filled = Math.max(0, Math.min(5, Number(count) || 0));
  return (
    <span className="ua-cfg-cr-stars" aria-label={`${filled} stars`}>
      <span>{"★★★★★".slice(0, filled)}</span>
      <span className="ua-cfg-cr-stars__empty">{"★★★★★".slice(filled)}</span>
    </span>
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
            <p className="ua-cfg-mv-upload-modal__sub">review photo · set the crop, ratio and zoom before it is attached</p>
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

function EditReviewModal({ review, onClose, onSave }) {
  const [quote, setQuote] = useState(asCopyString(review?.quote));

  useEffect(() => {
    setQuote(asCopyString(review?.quote));
  }, [review]);

  if (!review) return null;

  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-cr-edit" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="cr-edit-title">
        <div className="ua-cfg-cr-edit__head">
          <div>
            <p className="ua-cfg-rc-view__tag">Client review</p>
            <h3 id="cr-edit-title" className="ua-cfg-cr-edit__title">Edit review</h3>
            <p className="ua-cfg-cr-edit__sub">{asCopyString(review.name)}</p>
          </div>
          <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="ua-cfg-cr-edit__body">
          <label className="ua-cfg-cr-edit__field">
            <span>Review</span>
            <textarea
              className="ua-cfg-cr-edit__text"
              rows={5}
              value={quote}
              onChange={(event) => setQuote(event.target.value)}
            />
          </label>
        </div>
        <div className="ua-cfg-cr-edit__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary"
            onClick={() => onSave(typeof quote === "string" ? quote : "")}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientReviewSection({
  editor,
  setEditor,
  queue,
  setQueue,
  published,
  setPublished,
  gallery,
  setGallery,
  onToast,
}) {
  const [editing, setEditing] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("All owners");
  const [selected, setSelected] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);

  const programOptions = useMemo(() => {
    const tags = ["No program tag", ...CLIENT_REVIEW_PROGRAMS.filter((row) => row && row !== "No program tag")];
    return [...new Set(tags)].map((value) => ({ value, label: value }));
  }, []);

  function patch(next) {
    setEditor((prev) => ({ ...prev, ...next }));
  }

  function saveQuote(nextQuote) {
    const text = typeof nextQuote === "string" ? nextQuote : "";
    setQueue((prev) => prev.map((row) => (row.id === editing.id ? { ...row, quote: text } : row)));
    setPublished((prev) => prev.map((row) => (row.id === editing.id ? { ...row, quote: text } : row)));
    setEditing(null);
    onToast("Review updated");
  }

  function approve(entry) {
    setQueue((prev) => prev.filter((row) => row.id !== entry.id));
    setPublished((prev) => [{ ...entry, program: "No program tag", live: true }, ...prev]);
    onToast(`${entry.name} approved`);
  }

  function reject(entry) {
    setQueue((prev) => prev.filter((row) => row.id !== entry.id));
    onToast(`${entry.name} rejected`);
  }

  function moveItem(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= published.length) return;
    setPublished((prev) => {
      const copy = [...prev];
      const [row] = copy.splice(index, 1);
      copy.splice(next, 0, row);
      return copy;
    });
  }

  const liveCount = published.filter((entry) => entry.live).length;
  const filtered = useMemo(() => {
    return gallery.filter((entry) => {
      const matchesSearch = entry.title.toLowerCase().includes(search.trim().toLowerCase());
      const matchesOwner = owner === "All owners" || entry.owner === owner;
      return matchesSearch && matchesOwner;
    });
  }, [gallery, owner, search]);
  const selectedLive = selected.some((id) => gallery.find((entry) => entry.id === id)?.live);

  return (
    <div className="ua-cfg-cr">
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

      <Panel
        title="Review queue"
        subtitle="Submitted by clients in the app"
        actions={<strong className="ua-cfg-cr-count">{queue.length} awaiting review</strong>}
      >
        <div className="ua-cfg-cr-queue">
          {queue.length ? queue.map((entry) => (
            <article key={entry.id} className="ua-cfg-cr-row">
              <span className="ua-cfg-cr-avatar" aria-hidden="true">👤</span>
              <div className="ua-cfg-cr-row__copy">
                <div className="ua-cfg-cr-row__meta">
                  <strong>{entry.name}</strong>
                  <Stars count={entry.rating} />
                  <em className="ua-cfg-cr-pending">Pending</em>
                </div>
                <p>{entry.quote}</p>
              </div>
              <div className="ua-cfg-cr-row__actions">
                <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => setEditing(entry)}>Edit</button>
                <button type="button" className="ua-cfg-btn ua-cfg-btn--sm ua-cfg-cr-btn-approve" onClick={() => approve(entry)}>Approve</button>
                <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-cr-btn-reject" onClick={() => reject(entry)}>Reject</button>
              </div>
            </article>
          )) : <p className="ua-cfg-panel__sub">No reviews waiting.</p>}
        </div>
      </Panel>

      <Panel
        title="Live on site"
        subtitle={`${liveCount} published · reorder, tag a program, or disable`}
      >
        <div className="ua-cfg-cr-live__list">
          {published.map((entry, index) => (
            <article key={entry.id} className="ua-cfg-cr-row ua-cfg-cr-row--live">
              <span className="ua-cfg-cr-avatar" aria-hidden="true">👤</span>
              <div className="ua-cfg-cr-row__copy">
                <div className="ua-cfg-cr-row__meta">
                  <strong>{asCopyString(entry.name)}</strong>
                  <Stars count={entry.rating} />
                </div>
                <p>{asCopyString(entry.quote)}</p>
              </div>
              <div className="ua-cfg-cr-row__actions">
                <CfgSelect
                  className="ua-cfg-cr-tag"
                  ariaLabel={`Program tag for ${asCopyString(entry.name)}`}
                  options={programOptions}
                  value={entry.program || "No program tag"}
                  onChange={(value) => setPublished((prev) => prev.map((row) => (row.id === entry.id ? { ...row, program: value } : row)))}
                />
                <button type="button" className="ua-cfg-icon-btn" aria-label="Move up" disabled={index === 0} onClick={() => moveItem(index, -1)}>↑</button>
                <button type="button" className="ua-cfg-icon-btn" aria-label="Move down" disabled={index === published.length - 1} onClick={() => moveItem(index, 1)}>↓</button>
                <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>{entry.live ? "LIVE" : "HIDDEN"}</span>
                <button
                  type="button"
                  className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
                  aria-pressed={entry.live}
                  onClick={() => setPublished((prev) => prev.map((row) => (row.id === entry.id ? { ...row, live: !row.live } : row)))}
                >
                  <span className="ua-toggle__knob" />
                </button>
                <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => setEditing(entry)}>Edit</button>
                <button
                  type="button"
                  className="ua-cfg-icon-btn"
                  aria-label={`Delete ${asCopyString(entry.name)}`}
                  onClick={() => setPendingDelete(entry)}
                >
                  ×
                </button>
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <Panel
        title="Gallery"
        subtitle="Assets uploaded for this section — filter by owner or date, reuse, download or delete. Live assets must be unmarked first."
        actions={
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => setUploadOpen(true)}>
            + Upload media
          </button>
        }
      >
        <div className="ua-cfg-mv-gallery__filters">
          <input type="search" className="ua-cfg-mv-gallery__search" placeholder="Search media by name" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="ua-cfg-mv-gallery__select" value={owner} onChange={(event) => setOwner(event.target.value)}>
            {CLIENT_REVIEW_GALLERY_OWNERS.map((entry) => (
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

      <EditReviewModal review={editing} onClose={() => setEditing(null)} onSave={saveQuote} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag="Client review"
        title={`Delete ${asCopyString(pendingDelete?.name) || "this review"}?`}
        body="This removes the review from the live list."
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          setPublished((prev) => prev.filter((row) => row.id !== pendingDelete.id));
          setPendingDelete(null);
          onToast("Review deleted");
        }}
      />
      <UploadConfirmModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onConfirm={() => {
          setGallery((prev) => [
            {
              id: `cr-g-${Date.now()}`,
              title: "New client review photo",
              owner: "Anita Rao",
              date: "14 Aug 2026",
              size: "1.7 MB",
              versions: 1,
              live: false,
            },
            ...prev,
          ]);
          setUploadOpen(false);
          onToast("Photo attached");
        }}
      />
    </div>
  );
}
