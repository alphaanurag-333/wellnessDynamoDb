import { useCallback, useEffect, useRef, useState } from "react";
import {
  EMPTY_MEASUREMENT_CONFIG,
  getMeasurementVideoConfig,
  saveMeasurementGuideCopy,
  saveMeasurementGuideLink,
  saveMeasurementGuideLive,
  saveMeasurementGuideVideo,
  saveMeasurementParameterImage,
  validateMeasurementImageFile,
  validateMeasurementVideoFile,
} from "../api/measurementVideoApi.js";
import { MEASUREMENT_GUIDE, MEASUREMENT_PARAMETERS } from "../data/measurementVideoData.js";

function Panel({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
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

function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function youtubeThumbUrl(url) {
  const match = String(url || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : "";
}

function LinkModal({ open, title, initialUrl, onClose, onSave, busy }) {
  const [url, setUrl] = useState(initialUrl || "");

  useEffect(() => {
    if (open) setUrl(initialUrl || "");
  }, [initialUrl, open]);

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
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary"
            disabled={busy}
            onClick={() => onSave(url.trim())}
          >
            {busy ? "Saving…" : "Save link"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GuidePanel({ guide, busy, onToast, onChangeCopy, onChangeLink, onChangeVideo, onToggleLive }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: guide.title, description: guide.description });
  const [linkOpen, setLinkOpen] = useState(false);
  const [duration, setDuration] = useState(guide.duration || "");
  const videoInputRef = useRef(null);
  const coverThumb = youtubeThumbUrl(guide.linkUrl);
  const typeLabel = guide.sourceType === "link" ? "LINK" : guide.sourceType === "video" ? "VIDEO" : "OFF";

  useEffect(() => {
    if (!editing) {
      setDraft({ title: guide.title, description: guide.description });
    }
  }, [editing, guide.description, guide.title]);

  useEffect(() => {
    setDuration(guide.duration || "");
  }, [guide.duration, guide.videoUrl, guide.linkUrl]);

  async function saveEdit() {
    await onChangeCopy({ title: draft.title.trim(), description: draft.description.trim() });
    setEditing(false);
  }

  function cancelEdit() {
    setDraft({ title: guide.title, description: guide.description });
    setEditing(false);
  }

  return (
    <>
      <Panel
        className="ua-cfg-mv-panel"
        title="Measurement video"
        subtitle={
          <>
            One how-to-measure guide · cover photo, video and description shown in the app.
            <span className="ua-cfg-mv-panel__hint">One video only — uploading a new cover or video replaces what is live.</span>
          </>
        }
      >
        <article className={`ua-cfg-mv-guide${editing ? " is-editing" : ""}`}>
          <button
            type="button"
            className={`ua-cfg-mv-guide__cover${guide.videoUrl || coverThumb ? " has-media" : ""}`}
            disabled={busy}
            onClick={() => videoInputRef.current?.click()}
          >
            {guide.videoUrl ? (
              <video
                className="ua-cfg-mv-guide__cover-video"
                src={guide.videoUrl}
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={(event) => setDuration(formatClock(event.currentTarget.duration))}
              />
            ) : coverThumb ? (
              <img className="ua-cfg-mv-guide__cover-img" src={coverThumb} alt="" />
            ) : (
              <span className="ua-cfg-mv-guide__cover-icon" aria-hidden="true">▶</span>
            )}
            <em>Cover</em>
          </button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogg,.mov,.m4v"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onChangeVideo(file);
            }}
          />

          <div className="ua-cfg-mv-guide__main">
            <div className="ua-cfg-mv-guide__copy">
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
              {guide.sourceType === "link" && guide.linkUrl ? (
                <p className="ua-cfg-mv-guide__link">{guide.linkUrl}</p>
              ) : null}
            </div>

            <div className="ua-cfg-mv-guide__side">
              <div className="ua-cfg-mv-guide__meta">
                <span className="ua-cfg-mv-guide__badge">{typeLabel}</span>
                {duration ? <span className="ua-cfg-mv-guide__duration">{duration}</span> : null}
                <div className="ua-cfg-mv-guide__live">
                  <span className={`ua-cfg-faq__shown${guide.live ? " is-on" : ""}`}>
                    {guide.live ? "LIVE" : "HIDDEN"}
                  </span>
                  <button
                    type="button"
                    className={`ua-toggle ua-toggle--sm${guide.live ? " ua-toggle--on" : ""}`}
                    aria-pressed={guide.live}
                    aria-label={guide.live ? "Hide measurement guide" : "Make measurement guide live"}
                    disabled={busy}
                    onClick={() => onToggleLive(!guide.live)}
                  >
                    <span className="ua-toggle__knob" />
                  </button>
                </div>
              </div>
              <div className="ua-cfg-mv-guide__actions">
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                  disabled={busy}
                  onClick={() => videoInputRef.current?.click()}
                >
                  Video
                </button>
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                  disabled={busy}
                  onClick={() => setLinkOpen(true)}
                >
                  Link
                </button>
                {editing ? (
                  <>
                    <button
                      type="button"
                      className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                      disabled={busy}
                      onClick={saveEdit}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                      disabled={busy}
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                    disabled={busy}
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
        </article>
      </Panel>

      <LinkModal
        open={linkOpen}
        title={guide.title}
        initialUrl={guide.linkUrl}
        busy={busy}
        onClose={() => setLinkOpen(false)}
        onSave={async (url) => {
          if (!url) {
            onToast("Enter a video link");
            return;
          }
          const saved = await onChangeLink(url);
          if (saved) setLinkOpen(false);
        }}
      />
    </>
  );
}

function ParametersPanel({ parameters, busy, onUpload }) {
  const shownCount = parameters.filter((entry) => entry.hasImage).length;
  const inputRefs = useRef({});

  return (
    <Panel
      className="ua-cfg-mv-params"
      title="Internal parameters"
      subtitle="Reference images shown beside each measurement in the app. Images only — labels are fixed."
      actions={<span className="ua-cfg-mv-params__count">{shownCount} of {parameters.length} have images</span>}
    >
      <div className="ua-cfg-mv-params__grid">
        {parameters.map((entry) => (
          <article key={entry.id} className="ua-cfg-mv-param-card">
            <button
              type="button"
              className={`ua-cfg-mv-param-card__media${entry.hasImage ? " has-image" : ""}`}
              disabled={busy}
              onClick={() => inputRefs.current[entry.id]?.click()}
            >
              {entry.url ? (
                <img src={entry.url} alt="" className="ua-cfg-mv-param-card__img" />
              ) : (
                <span className="ua-cfg-mv-param-card__icon" aria-hidden="true">🧍</span>
              )}
              <span>{entry.hasImage ? "Replace image" : "Upload image"}</span>
            </button>
            <input
              ref={(node) => {
                inputRefs.current[entry.id] = node;
              }}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) onUpload(entry, file);
              }}
            />
            <div className="ua-cfg-mv-param-card__foot">
              <span className="ua-cfg-mv-param-card__name">{entry.name}</span>
              <span className={`ua-cfg-mv-param-card__shown${entry.hasImage ? " is-on" : ""}`}>
                {entry.hasImage ? "Ready" : "No image"}
              </span>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

export function MeasurementVideoSection({ guide, setGuide, parameters, setParameters, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const applyConfig = useCallback((next) => {
    if (!next) return;
    setGuide(next.guide);
    setParameters(next.parameters);
  }, [setGuide, setParameters]);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      applyConfig(await getMeasurementVideoConfig());
    } catch (error) {
      onToast(error?.message || "Failed to load measurement guide");
      applyConfig(EMPTY_MEASUREMENT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, [applyConfig, onToast]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  async function runSave(work, successMessage) {
    if (busy) return null;
    setBusy(true);
    try {
      const next = await work();
      applyConfig(next);
      if (successMessage) onToast(successMessage);
      return next;
    } catch (error) {
      onToast(error?.message || "Failed to save measurement guide");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ua-cfg-mv">
      {loading ? (
        <Panel className="ua-cfg-mv-panel" title="Measurement video" subtitle="Loading measurement guide from App Config…">
          <p className="ua-cfg-panel__sub">Fetching the how-to-measure video and reference images…</p>
        </Panel>
      ) : (
        <>
          <GuidePanel
            guide={guide}
            busy={busy}
            onToast={onToast}
            onChangeCopy={(next) => runSave(() => saveMeasurementGuideCopy(next), "Measurement guide saved")}
            onChangeLink={(url) => runSave(() => saveMeasurementGuideLink(url), "Video link saved")}
            onChangeVideo={(file) => {
              const invalid = validateMeasurementVideoFile(file);
              if (invalid) {
                onToast(invalid);
                return null;
              }
              return runSave(() => saveMeasurementGuideVideo(file), "Measurement video uploaded");
            }}
            onToggleLive={(live) =>
              runSave(() => saveMeasurementGuideLive(live, guide), live ? "Measurement guide is live" : "Measurement guide hidden")
            }
          />
          <ParametersPanel
            parameters={parameters}
            busy={busy}
            onUpload={(entry, file) => {
              const invalid = validateMeasurementImageFile(file);
              if (invalid) {
                onToast(invalid);
                return;
              }
              runSave(() => saveMeasurementParameterImage(entry.field, file), `${entry.name} image attached`);
            }}
          />
        </>
      )}
    </div>
  );
}

export { MEASUREMENT_GUIDE, MEASUREMENT_PARAMETERS };
