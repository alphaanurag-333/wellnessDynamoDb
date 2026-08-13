import { useMemo, useState } from "react";
import {
  ONBOARDING_ALERT,
  ONBOARDING_COACHES,
  ONBOARDING_GALLERY,
  ONBOARDING_GALLERY_OWNERS,
  ONBOARDING_GALLERY_PICKS,
  ONBOARDING_STATS,
} from "../data/onboardingVideoData.js";

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

function statusLabel(status) {
  if (status === "live") return "Live";
  if (status === "draft") return "Draft";
  return "Not uploaded";
}

function sourceLabel(sourceType) {
  if (sourceType === "link") return "video link";
  if (sourceType === "gallery") return "picked from Gallery";
  if (sourceType === "upload") return "direct upload";
  return "not set";
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
  const [ratio, setRatio] = useState("16:9");
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

function StatsPanel({ stats, alert }) {
  return (
    <Panel
      title="Onboarding video · one per coach"
      subtitle="Each wellness coach gets one auto-tagged video. Clients see their coach's video on day 1 — or the default until one is uploaded."
    >
      <div className="ua-cfg-onb-stats">
        <div className="ua-cfg-onb-stats__cell">
          <strong>{stats.totalCoaches}</strong>
          <span>Wellness coaches</span>
        </div>
        <div className="ua-cfg-onb-stats__cell">
          <strong>{stats.liveVideos}</strong>
          <span>Videos live</span>
        </div>
        <div className="ua-cfg-onb-stats__cell">
          <strong>{stats.awaitingUpload}</strong>
          <span>Awaiting upload</span>
        </div>
        <div className="ua-cfg-onb-stats__cell">
          <strong className="ua-cfg-onb-stats__tag">{stats.fallbackTag}</strong>
          <span>Fallback tag</span>
        </div>
      </div>
      <div className="ua-cfg-onb-alert">{alert}</div>
    </Panel>
  );
}

function CoachEditor({ coach, onChange, onToast }) {
  const [draft, setDraft] = useState({ title: coach.title, description: coach.description });
  const [linkOpen, setLinkOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [coverSaved, setCoverSaved] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateCoach(patch) {
    onChange({ ...coach, ...patch });
  }

  function saveCopy() {
    updateCoach({
      title: draft.title.trim(),
      description: draft.description.trim(),
      version: coach.version + 1,
      status: coach.status === "not-uploaded" ? "draft" : coach.status,
    });
    setSaved(true);
    onToast("Coach video saved");
    setTimeout(() => setSaved(false), 2000);
  }

  const hasVideo = Boolean(coach.title || coach.duration);

  return (
    <>
      <Panel className="ua-cfg-onb-editor-panel">
        <div className="ua-cfg-onb-editor__head">
          <div className="ua-cfg-onb-editor__identity">
            <strong>{coach.name}</strong>
            <span className="ua-cfg-onb-editor__tag">{coach.tag}</span>
            {coach.version ? <span className="ua-cfg-onb-editor__version">v{coach.version}</span> : null}
            {coach.live ? (
              <span className="ua-cfg-onb-editor__status ua-cfg-onb-editor__status--live">Live</span>
            ) : coach.status === "draft" ? (
              <span className="ua-cfg-onb-editor__status ua-cfg-onb-editor__status--draft">Draft</span>
            ) : null}
          </div>
          <span className="ua-cfg-onb-editor__meta">
            {coach.clients} clients{coach.duration ? ` · ${coach.duration}` : ""}
          </span>
        </div>
        <p className="ua-cfg-onb-editor__hint">Editing on behalf of this coach. Pick another coach from the roster below.</p>

        <div className="ua-cfg-onb-editor">
          <div className="ua-cfg-onb-editor__media">
            <button type="button" className="ua-cfg-onb-editor__cover" onClick={() => setCoverOpen(true)}>
              <span className="ua-cfg-onb-editor__play" aria-hidden="true">▶</span>
              <span className="ua-cfg-onb-editor__cover-btn">Replace cover</span>
            </button>
            <span className="ua-cfg-onb-editor__cover-note">Cover photo · 16:9 · shown in the app card</span>
          </div>

          <div className="ua-cfg-onb-editor__main">
            <input
              type="text"
              className="ua-cfg-onb-editor__title"
              placeholder="Video title"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
            <textarea
              className="ua-cfg-onb-editor__desc"
              rows={3}
              placeholder="Short description shown under the video in the app"
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />

            <div className="ua-cfg-onb-editor__actions">
              <div className="ua-cfg-onb-editor__actions-left">
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={() => setVideoOpen(true)}>
                  Replace video
                </button>
                <button
                  type="button"
                  className={`ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm${coach.sourceType === "link" ? " is-linked" : ""}`}
                  onClick={() => setLinkOpen(true)}
                >
                  {coach.sourceType === "link" ? "Linked" : "Use a link"}
                </button>
                <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" onClick={saveCopy}>
                  {saved ? "Saved" : "Save"}
                </button>
                <button
                  type="button"
                  className={`ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm${coverSaved ? " ua-cfg-onb-editor__cover-saved" : ""}`}
                  onClick={() => {
                    setCoverSaved(true);
                    onToast("Cover saved to Gallery");
                    setTimeout(() => setCoverSaved(false), 2000);
                  }}
                >
                  {coverSaved ? "Saved to Gallery" : "Save cover to Gallery"}
                </button>
              </div>
              <div className="ua-cfg-onb-editor__live">
                <span>Live</span>
                <button
                  type="button"
                  className={`ua-toggle ua-toggle--sm${coach.live ? " ua-toggle--on" : ""}`}
                  aria-pressed={coach.live}
                  disabled={!hasVideo}
                  onClick={() => {
                    const nextLive = !coach.live;
                    updateCoach({
                      live: nextLive,
                      status: nextLive ? "live" : coach.status === "not-uploaded" ? "not-uploaded" : "draft",
                    });
                  }}
                >
                  <span className="ua-toggle__knob" />
                </button>
              </div>
            </div>

            <p className="ua-cfg-onb-editor__foot">
              Auto-tagged {coach.tag} · delivered only to {coach.name}&apos;s {coach.clients} clients on day 1 of their journey.
              {coach.sourceType ? ` Source: ${sourceLabel(coach.sourceType)}.` : ""}
            </p>
          </div>
        </div>
      </Panel>

      <LinkModal
        open={linkOpen}
        title={coach.name}
        onClose={() => setLinkOpen(false)}
        onSave={(url) => {
          if (!url) {
            onToast("Enter a video link");
            return;
          }
          updateCoach({
            sourceType: "link",
            linkUrl: url,
            duration: coach.duration || "3:30",
            status: coach.status === "not-uploaded" ? "draft" : coach.status,
            version: coach.version + 1,
          });
          setLinkOpen(false);
          onToast("Video link saved");
        }}
      />

      <UploadConfirmModal
        open={coverOpen}
        label="ovcover"
        onClose={() => setCoverOpen(false)}
        onConfirm={() => {
          updateCoach({ hasCover: true });
          setCoverOpen(false);
          onToast("Cover attached");
        }}
      />

      <UploadConfirmModal
        open={videoOpen}
        label={coach.tag}
        onClose={() => setVideoOpen(false)}
        onConfirm={() => {
          updateCoach({
            sourceType: "upload",
            duration: coach.duration || "4:00",
            status: coach.status === "not-uploaded" ? "draft" : coach.status,
            version: coach.version + 1,
          });
          setVideoOpen(false);
          onToast("Video attached");
        }}
      />
    </>
  );
}

function PickFromGallery({ coach, picks, onPick }) {
  return (
    <Panel
      title="Pick from Gallery"
      subtitle="Existing videos in the Gallery. Picking one tags it to this coach immediately."
      actions={<span className="ua-cfg-onb-pick__tag">{coach.tag}</span>}
    >
      <div className="ua-cfg-onb-pick__grid">
        {picks.map((entry) => {
          const isSelected = coach.galleryPickId === entry.id || entry.tag === coach.tag;
          return (
            <button
              key={entry.id}
              type="button"
              className={`ua-cfg-onb-pick-card${isSelected ? " is-selected" : ""}`}
              onClick={() => onPick(entry)}
            >
              <div className="ua-cfg-onb-pick-card__thumb">
                <span aria-hidden="true">▶</span>
              </div>
              <strong>{entry.title}</strong>
              <div className="ua-cfg-onb-pick-card__meta">
                <span className={`ua-cfg-onb-pick-card__badge${entry.tag === "Untagged" ? " is-muted" : ""}`}>
                  {entry.tag}
                </span>
                <span>{entry.duration}</span>
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function CoachRoster({ coaches, selectedId, onSelect }) {
  return (
    <Panel
      title="Coach roster"
      subtitle="One row per wellness coach. Click a row to open that coach's video."
    >
      <div className="ua-cfg-onb-roster-wrap">
        <table className="ua-cfg-onb-roster">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Coach</th>
              <th>Reaches</th>
              <th>Video</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {coaches.map((entry) => (
              <tr
                key={entry.id}
                className={entry.id === selectedId ? "is-selected" : ""}
                onClick={() => onSelect(entry.id)}
              >
                <td><span className="ua-cfg-onb-roster__tag">{entry.tag}</span></td>
                <td><strong>{entry.name}</strong></td>
                <td>{entry.clients} clients</td>
                <td className={entry.title ? "" : "is-empty"}>
                  {entry.title ? `${entry.title} · ${entry.duration}` : "No video yet · —"}
                </td>
                <td>
                  <span className={`ua-cfg-onb-roster__status ua-cfg-onb-roster__status--${entry.status}`}>
                    {statusLabel(entry.status).toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
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
          {ONBOARDING_GALLERY_OWNERS.map((entry) => (
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

export function OnboardingVideoSection({
  coaches,
  setCoaches,
  selectedCoachId,
  setSelectedCoachId,
  gallery,
  setGallery,
  onToast,
}) {
  const selectedCoach = coaches.find((entry) => entry.id === selectedCoachId) ?? coaches[0];

  function updateCoach(nextCoach) {
    setCoaches(coaches.map((entry) => (entry.id === nextCoach.id ? nextCoach : entry)));
  }

  function pickGalleryVideo(pick) {
    if (!selectedCoach) return;
    updateCoach({
      ...selectedCoach,
      title: pick.title,
      duration: pick.duration,
      sourceType: "gallery",
      galleryPickId: pick.id,
      status: selectedCoach.status === "not-uploaded" ? "draft" : selectedCoach.status,
      version: selectedCoach.version + 1,
    });
    onToast(`Tagged ${pick.title} to ${selectedCoach.name}`);
  }

  return (
    <div className="ua-cfg-onb">
      <StatsPanel stats={ONBOARDING_STATS} alert={ONBOARDING_ALERT} />
      {selectedCoach ? (
        <CoachEditor
          key={selectedCoach.id}
          coach={selectedCoach}
          onChange={updateCoach}
          onToast={onToast}
        />
      ) : null}
      {selectedCoach ? (
        <PickFromGallery coach={selectedCoach} picks={ONBOARDING_GALLERY_PICKS} onPick={pickGalleryVideo} />
      ) : null}
      <CoachRoster coaches={coaches} selectedId={selectedCoachId} onSelect={setSelectedCoachId} />
      <GalleryPanel gallery={gallery} setGallery={setGallery} onToast={onToast} />
    </div>
  );
}

export {
  ONBOARDING_COACHES,
  ONBOARDING_GALLERY,
  ONBOARDING_STATS,
};
