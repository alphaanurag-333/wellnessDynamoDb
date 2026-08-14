import { useEffect, useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";

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
          <h3 className="ua-cfg-panel__title">{title}</h3>
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function UploadConfirmModal({ open, label, defaultRatio = "Original", onClose, onConfirm }) {
  const [ratio, setRatio] = useState(defaultRatio);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (!open) return undefined;
    setRatio(defaultRatio);
    setZoom(100);
    return undefined;
  }, [open, defaultRatio]);

  if (!open) return null;

  const crop = cropBoxSize(ratio);

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
          <div
            className="ua-cfg-mv-upload-modal__crop-inner ua-cfg-pt-crop"
            style={{
              width: crop.width,
              height: crop.height,
              transform: `scale(${zoom / 100})`,
            }}
          >
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
          <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => { setRatio(defaultRatio); setZoom(100); }}>Reset</button>
        </div>
        <div className="ua-cfg-mv-upload-modal__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>Discard</button>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={onConfirm}>Confirm &amp; attach</button>
        </div>
      </div>
    </div>
  );
}

function messageStatus(entry) {
  if (!entry.live) return "HIDDEN";
  if (entry.web && entry.app) return "LIVE · BOTH";
  if (entry.web) return "LIVE · WEB";
  if (entry.app) return "LIVE · APP";
  return "HIDDEN";
}

function messageMeta(entry) {
  const designation = asCopyString(entry.designation);
  const liveSince = asCopyString(entry.liveSince);
  if (designation && liveSince) return `${designation} · live since ${liveSince}`;
  if (designation) return designation;
  return `${asCopyString(entry.duration)} · uploaded ${asCopyString(entry.uploaded)}`;
}

function EditMessageModal({ message, onClose, onSave, onDelete, onPreview, onReplace }) {
  const [title, setTitle] = useState(asCopyString(message?.title));
  const [description, setDescription] = useState(asCopyString(message?.description));

  useEffect(() => {
    setTitle(asCopyString(message?.title));
    setDescription(asCopyString(message?.description));
  }, [message]);

  if (!message) return null;

  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-cf-edit" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="cf-edit-title">
        <div className="ua-cfg-cf-edit__head">
          <div>
            <h3 id="cf-edit-title" className="ua-cfg-cf-edit__title">
              <span aria-hidden="true">✎</span> Edit message
            </h3>
            <p className="ua-cfg-cf-edit__sub">{asCopyString(message.title)}</p>
          </div>
          <button type="button" className="ua-cfg-mv-upload-modal__close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <label className="ua-cfg-cf-label">Title</label>
        <input className="ua-cfg-vh-input" value={title} onChange={(event) => setTitle(event.target.value)} />
        <label className="ua-cfg-cf-label">Description</label>
        <textarea className="ua-cfg-tf-story" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
        <label className="ua-cfg-cf-label">Video</label>
        <div className="ua-cfg-cf-video-row">
          <span className="ua-cfg-vh-thumb" aria-hidden="true">▶</span>
          <strong>{message.videoAttached ? "Current video attached" : "No video yet"}</strong>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={onReplace}>Replace</button>
        </div>
        <div className="ua-cfg-cf-edit__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--muted" onClick={onPreview}>Preview</button>
          <div className="ua-cfg-cf-edit__foot-right">
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-cr-link--reject" onClick={() => onDelete(message.id)}>Delete</button>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>Leave as is</button>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={() => onSave({ title, description })}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CofounderSection({
  editor,
  setEditor,
  photos = [],
  setPhotos,
  messages,
  setMessages,
  onToast,
  onOpenPreview,
  titleOptions,
  showPhotoHistory = true,
  cropLabel = "founder",
  photoHint,
  liveTitle = "Live messages",
  liveSubtitle = "Edit or disable what is published",
}) {
  const [uploadKind, setUploadKind] = useState(null);
  const [editing, setEditing] = useState(null);

  function patch(next) {
    setEditor((prev) => ({ ...prev, ...next }));
  }

  function togglePhotoSurface(id, surface) {
    setPhotos((prev) => prev.map((entry) => {
      if (entry.id !== id) {
        return surface === "web" ? { ...entry, web: false } : { ...entry, app: false };
      }
      return { ...entry, [surface]: !entry[surface] };
    }));
    patch({ photoUploaded: true });
  }

  function moveMessage(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= messages.length) return;
    setMessages((prev) => {
      const copy = [...prev];
      const [row] = copy.splice(index, 1);
      copy.splice(next, 0, row);
      return copy;
    });
  }

  const livePhoto = photos.some((entry) => entry.web || entry.app);

  return (
    <div className="ua-cfg-cf">
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

      <Panel
        title="Display photo"
        subtitle="Portrait used beside the message on the website. Square or 4:5 works best."
        actions={<span className="ua-cfg-cf-chip">Shown on web</span>}
      >
        <div className="ua-cfg-cf-photo">
          <div className={`ua-cfg-vh-drop ua-cfg-vh-drop--cover${editor.photoUploaded || livePhoto ? " is-on" : ""}`}>
            <span aria-hidden="true">👤</span>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setUploadKind("founder")}>
              {editor.photoUploaded || livePhoto ? "Replace photo" : "Upload photo"}
            </button>
          </div>
          <div>
            <div className="ua-cfg-cf-photo__status">
              <strong>{editor.photoUploaded || livePhoto ? "Photo attached" : "No photo yet"}</strong>
              {editor.photoUploaded || livePhoto ? null : <em>Required</em>}
            </div>
            {showPhotoHistory ? (
              <>
            <div className="ua-cfg-cf-history-head">
              <span>Photo history</span>
              <span>Tick a surface to make one live</span>
            </div>
            <div className="ua-cfg-cf-history">
              {photos.map((entry) => {
                const live = entry.web || entry.app;
                return (
                  <article key={entry.id} className={`ua-cfg-cf-history__card ua-cfg-cf-history__card--${entry.tone}${live ? " is-live" : ""}`}>
                    <span className="ua-cfg-cf-history__swatch" />
                    <strong>{entry.date}</strong>
                    {entry.web && entry.app ? <em>LIVE</em> : null}
                    <div className="ua-cfg-cf-history__pills">
                      <button type="button" className={entry.web ? "is-on" : ""} onClick={() => togglePhotoSurface(entry.id, "web")}>Web</button>
                      <button type="button" className={entry.app ? "is-on" : ""} onClick={() => togglePhotoSurface(entry.id, "app")}>App</button>
                    </div>
                    <span className="ua-cfg-cf-history__hint">{entry.web && entry.app ? "Live on both" : "Set both"}</span>
                  </article>
                );
              })}
            </div>
            {photoHint ? <p className="ua-cfg-panel__sub">{photoHint}</p> : null}
              </>
            ) : (
              <p className="ua-cfg-panel__sub">{photoHint || "Upload a portrait for this leader — cropping and zoom are set in the upload dialog."}</p>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="Details" subtitle="Shown alongside the video on both surfaces.">
        <div className="ua-cfg-cf-details">
          <label className="ua-cfg-cf-label">Name</label>
          <input className="ua-cfg-vh-input" value={asCopyString(editor.name)} onChange={(event) => patch({ name: event.target.value })} />
          <label className="ua-cfg-cf-label">Title</label>
          {titleOptions?.length ? (
            <select className="ua-cfg-vh-input" value={asCopyString(editor.title)} onChange={(event) => patch({ title: event.target.value })}>
              {titleOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input className="ua-cfg-vh-input" value={asCopyString(editor.title)} onChange={(event) => patch({ title: event.target.value })} />
          )}
          <label className="ua-cfg-cf-label">Description</label>
          <textarea
            className="ua-cfg-tf-story"
            rows={4}
            value={asCopyString(editor.description)}
            onChange={(event) => patch({ description: event.target.value })}
          />
        </div>
      </Panel>

      <section className="ua-cfg-cr-live">
        <div className="ua-cfg-cr-live__head">
          <strong>✓ {liveTitle}</strong>
          <span>{liveSubtitle}</span>
        </div>
        <div className="ua-cfg-cr-live__list">
          {messages.map((entry, index) => {
            const status = messageStatus(entry);
            return (
              <article key={entry.id} className="ua-cfg-cf-msg">
                <span className="ua-cfg-vh-thumb" aria-hidden="true">▶</span>
                <div className="ua-cfg-vh-copy">
                  <strong>{asCopyString(entry.title)}</strong>
                  <p>{messageMeta(entry)}</p>
                </div>
                <span className={`ua-cfg-faq__shown${entry.live && (entry.web || entry.app) ? " is-on" : ""}`}>{status}</span>
                <button
                  type="button"
                  className={`ua-cfg-cf-pill${entry.web ? " is-on" : ""}`}
                  onClick={() => setMessages((prev) => prev.map((row) => {
                    if (row.id !== entry.id) return row;
                    const web = !row.web;
                    return { ...row, web, live: web || row.app };
                  }))}
                >
                  Web
                </button>
                <button
                  type="button"
                  className={`ua-cfg-cf-pill${entry.app ? " is-on" : ""}`}
                  onClick={() => setMessages((prev) => prev.map((row) => {
                    if (row.id !== entry.id) return row;
                    const app = !row.app;
                    return { ...row, app, live: row.web || app };
                  }))}
                >
                  App
                </button>
                <button type="button" className="ua-cfg-icon-btn" aria-label="Move up" disabled={index === 0} onClick={() => moveMessage(index, -1)}>↑</button>
                <button type="button" className="ua-cfg-icon-btn" aria-label="Move down" disabled={index === messages.length - 1} onClick={() => moveMessage(index, 1)}>↓</button>
                <button
                  type="button"
                  className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
                  aria-pressed={entry.live}
                  onClick={() => setMessages((prev) => prev.map((row) => {
                    if (row.id !== entry.id) return row;
                    if (row.live) return { ...row, live: false };
                    const needSurfaces = !row.web && !row.app;
                    return { ...row, live: true, web: needSurfaces ? true : row.web, app: needSurfaces ? true : row.app };
                  }))}
                >
                  <span className="ua-toggle__knob" />
                </button>
                <button type="button" className="ua-cfg-cr-link ua-cfg-cr-link--modify" onClick={() => setEditing(entry)}>Edit</button>
              </article>
            );
          })}
        </div>
      </section>

      <div className="ua-cfg-cf-shared">
        <span aria-hidden="true">🔗</span>
        <div>
          <strong>Shared upload</strong>
          <p>{editor.sharedUpload ? "One video powers app and web" : "Upload separate video per surface"}</p>
        </div>
        <button
          type="button"
          className={`ua-toggle ua-toggle--sm${editor.sharedUpload ? " ua-toggle--on" : ""}`}
          aria-pressed={editor.sharedUpload}
          onClick={() => patch({ sharedUpload: !editor.sharedUpload })}
        >
          <span className="ua-toggle__knob" />
        </button>
      </div>

      {editor.sharedUpload ? (
        <Panel title="Video · app + web" actions={<span className="ua-cfg-cf-chip ua-cfg-cf-chip--both">Used on both</span>}>
          <div className="ua-cfg-cf-shared-grid">
            <div className={`ua-cfg-vh-drop${editor.videoUploaded ? " is-on" : ""}`}>
              <span className="ua-cfg-vh-drop__play" aria-hidden="true">▶</span>
              <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setUploadKind("video")}>
                {editor.videoUploaded ? "Replace video" : "Upload video"}
              </button>
            </div>
            <div className="ua-cfg-cf-side">
              <div className="ua-cfg-cf-portrait">
                <span aria-hidden="true">👤</span>
                <strong>Portrait photo</strong>
                <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => setUploadKind("founder")}>Upload</button>
              </div>
              <input
                type="url"
                className="ua-cfg-vh-input"
                placeholder="Paste a video link instead"
                value={asCopyString(editor.videoLink)}
                onChange={(event) => patch({ videoLink: event.target.value })}
              />
            </div>
          </div>
        </Panel>
      ) : (
        <div className="ua-cfg-cf-split">
          <section className="ua-cfg-cf-surface ua-cfg-cf-surface--app">
            <h3>📱 App</h3>
            <div className={`ua-cfg-vh-drop${editor.appVideo ? " is-on" : ""}`}>
              <span className="ua-cfg-vh-drop__play" aria-hidden="true">▶</span>
              <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setUploadKind("app-video")}>Upload video</button>
            </div>
            <div className="ua-cfg-cf-portrait">
              <span aria-hidden="true">👤</span>
              <strong>Portrait photo</strong>
              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => setUploadKind("app-portrait")}>Upload image</button>
            </div>
          </section>
          <section className="ua-cfg-cf-surface ua-cfg-cf-surface--web">
            <h3>🌐 Web</h3>
            <div className={`ua-cfg-vh-drop ua-cfg-vh-drop--web${editor.webVideo ? " is-on" : ""}`}>
              <span className="ua-cfg-vh-drop__play" aria-hidden="true">▶</span>
              <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={() => setUploadKind("web-video")}>Upload video</button>
            </div>
            <div className="ua-cfg-cf-portrait">
              <span aria-hidden="true">👤</span>
              <strong>Portrait photo</strong>
              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={() => setUploadKind("web-portrait")}>Upload image</button>
            </div>
          </section>
        </div>
      )}

      <EditMessageModal
        message={editing}
        onClose={() => setEditing(null)}
        onPreview={onOpenPreview}
        onReplace={() => setUploadKind("video")}
        onDelete={(id) => {
          setMessages((prev) => prev.filter((row) => row.id !== id));
          setEditing(null);
          onToast("Message deleted");
        }}
        onSave={({ title, description }) => {
          setMessages((prev) => prev.map((row) => (row.id === editing.id ? { ...row, title: asCopyString(title), description: asCopyString(description) } : row)));
          setEditing(null);
          onToast("Message saved");
        }}
      />

      <UploadConfirmModal
        open={Boolean(uploadKind)}
        label={uploadKind === "founder" || uploadKind?.includes("portrait") ? cropLabel : "video"}
        defaultRatio={uploadKind === "founder" || uploadKind?.includes("portrait") ? "3:4" : "Original"}
        onClose={() => setUploadKind(null)}
        onConfirm={() => {
          if (uploadKind === "founder") {
            patch({ photoUploaded: true });
            if (showPhotoHistory && setPhotos) {
              setPhotos((prev) => [
                { id: `cf-p-${Date.now()}`, date: "14 Aug 2026", tone: "blue", web: true, app: true },
                ...prev.map((entry) => ({ ...entry, web: false, app: false })),
              ]);
            }
          } else if (uploadKind === "video") patch({ videoUploaded: true });
          else if (uploadKind === "app-video") patch({ appVideo: true });
          else if (uploadKind === "web-video") patch({ webVideo: true });
          else if (uploadKind === "app-portrait") patch({ appPortrait: true });
          else if (uploadKind === "web-portrait") patch({ webPortrait: true });
          setUploadKind(null);
          onToast("File attached");
        }}
      />
    </div>
  );
}
