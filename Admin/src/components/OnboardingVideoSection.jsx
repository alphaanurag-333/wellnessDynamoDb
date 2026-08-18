import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ONBOARDING_PAGE_SIZE,
  listOnboardingCoaches,
  mergeOnboardingCoach,
  saveCoachIntroCopy,
  saveCoachIntroCover,
  saveCoachIntroGalleryPick,
  saveCoachIntroLink,
  saveCoachIntroLive,
  saveCoachIntroVideo,
  validateIntroCoverFile,
  validateIntroVideoFile,
  videoPreviewSrc,
} from "../api/coachContentApi.js";
import {
  ONBOARDING_COACHES,
  ONBOARDING_GALLERY,
  buildOnboardingAlert,
  buildOnboardingStats,
} from "../data/onboardingVideoData.js";
import { ListPagination } from "./shared.jsx";

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

function VideoThumb({ item, className = "" }) {
  const preview = videoPreviewSrc(item);
  if (item?.coverUrl) {
    return <img className={className} src={item.coverUrl} alt="" />;
  }
  if (preview?.type === "video") {
    return <video className={className} src={preview.src} muted preload="metadata" playsInline />;
  }
  if (preview?.type === "iframe") {
    return <iframe className={className} title={item?.displayTitle || item?.title || "Video"} src={preview.src} tabIndex={-1} />;
  }
  return <span aria-hidden="true">▶</span>;
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

function StatsPanel({ stats, alert }) {
  return (
    <Panel
      title="Onboarding video · one per coach"
      subtitle="Each wellness coach gets one auto-tagged video. Clients see their coach's video on day 1 — or nothing until one is uploaded."
    >
      <div className="ua-cfg-onb-stats">
        <div className="ua-cfg-onb-stats__cell">
          <strong>{stats.totalCoaches}</strong>
          <span>Wellness coaches</span>
        </div>
        <div className="ua-cfg-onb-stats__cell">
          <strong>{stats.liveVideos}</strong>
          <span>Live on this page</span>
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

function CoachEditor({ coach, busy, onToast, onSaveCopy, onSaveLink, onSaveVideo, onSaveCover, onToggleLive }) {
  const [draft, setDraft] = useState({ title: coach.title, description: coach.description });
  const [linkOpen, setLinkOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const videoInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const hasVideo = Boolean(coach.videoUrl || coach.linkUrl);
  const preview = videoPreviewSrc(coach);

  useEffect(() => {
    setDraft({ title: coach.title, description: coach.description });
    setSaved(false);
  }, [coach.description, coach.id, coach.title]);

  async function saveCopy() {
    await onSaveCopy({ title: draft.title.trim(), description: draft.description.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <Panel title={coach.name} subtitle={`Tag ${coach.tag}`}>
        <div className="ua-cfg-onb-editor__head">
          <div className="ua-cfg-onb-editor__badges">
            {coach.version ? <span className="ua-cfg-onb-editor__version">v{coach.version}</span> : null}
            {coach.live ? (
              <span className="ua-cfg-onb-editor__status ua-cfg-onb-editor__status--live">Live</span>
            ) : coach.status === "draft" ? (
              <span className="ua-cfg-onb-editor__status ua-cfg-onb-editor__status--draft">Draft</span>
            ) : null}
          </div>
          <span className="ua-cfg-onb-editor__meta">
            {coach.duration || (hasVideo ? "Video on file" : "No video yet")}
          </span>
        </div>
        <p className="ua-cfg-onb-editor__hint">Editing on behalf of this coach. Pick another coach from the roster below.</p>

        <div className="ua-cfg-onb-editor">
          <div className="ua-cfg-onb-editor__media">
            <div className="ua-cfg-onb-editor__cover">
              {preview?.type === "video" ? (
                <video src={preview.src} poster={coach.coverUrl || undefined} controls preload="metadata" />
              ) : preview?.type === "iframe" ? (
                <iframe title={coach.displayTitle || coach.name} src={preview.src} allow="autoplay; fullscreen" allowFullScreen />
              ) : (
                <span className="ua-cfg-onb-editor__play" aria-hidden="true">▶</span>
              )}
              <button
                type="button"
                className="ua-cfg-onb-editor__cover-btn"
                onClick={() => coverInputRef.current?.click()}
                disabled={busy}
              >
                Replace cover
              </button>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                const invalid = validateIntroCoverFile(file);
                if (invalid) {
                  onToast(invalid);
                  return;
                }
                onSaveCover(file);
              }}
            />
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
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" disabled={busy} onClick={() => videoInputRef.current?.click()}>
                  {hasVideo ? "Replace video" : "Upload video"}
                </button>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    const invalid = validateIntroVideoFile(file);
                    if (invalid) {
                      onToast(invalid);
                      return;
                    }
                    onSaveVideo(file);
                  }}
                />
                <button
                  type="button"
                  className={`ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm${coach.sourceType === "link" ? " is-linked" : ""}`}
                  disabled={busy}
                  onClick={() => setLinkOpen(true)}
                >
                  {coach.sourceType === "link" ? "Linked" : "Use a link"}
                </button>
                <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" disabled={busy} onClick={saveCopy}>
                  {saved ? "Saved" : "Save"}
                </button>
              </div>
              <div className="ua-cfg-onb-editor__live">
                <span>Live</span>
                <button
                  type="button"
                  className={`ua-toggle ua-toggle--sm${coach.live ? " ua-toggle--on" : ""}`}
                  aria-pressed={coach.live}
                  disabled={!hasVideo || busy}
                  onClick={() => onToggleLive(!coach.live)}
                >
                  <span className="ua-toggle__knob" />
                </button>
              </div>
            </div>

            <p className="ua-cfg-onb-editor__foot">
              Auto-tagged {coach.tag} · delivered to {coach.name}&apos;s clients on day 1 of their journey.
              {coach.sourceType ? ` Source: ${sourceLabel(coach.sourceType)}.` : ""}
            </p>
          </div>
        </div>
      </Panel>

      <LinkModal
        open={linkOpen}
        title={coach.name}
        initialUrl={coach.linkUrl}
        busy={busy}
        onClose={() => setLinkOpen(false)}
        onSave={async (url) => {
          if (!url) {
            onToast("Enter a video link");
            return;
          }
          const savedCoach = await onSaveLink(url);
          if (savedCoach) setLinkOpen(false);
        }}
      />
    </>
  );
}

function PickFromGallery({ coach, picks, busy, onPick }) {
  return (
    <Panel
      title="Pick from Gallery"
      subtitle="Existing videos already attached to a coach. Picking one tags it to this coach immediately."
      actions={<span className="ua-cfg-onb-pick__tag">{coach.tag}</span>}
    >
      {picks.length ? (
        <div className="ua-cfg-onb-pick__grid">
          {picks.map((entry) => {
            const isSelected = coach.galleryPickId === entry.id || (entry.id === coach.id && Boolean(coach.videoUrl || coach.linkUrl));
            return (
              <button
                key={entry.id}
                type="button"
                className={`ua-cfg-onb-pick-card${isSelected ? " is-selected" : ""}`}
                disabled={busy || entry.id === coach.id}
                onClick={() => onPick(entry)}
              >
                <div className="ua-cfg-onb-pick-card__thumb">
                  <VideoThumb item={entry} />
                </div>
                <strong>{entry.displayTitle || entry.title}</strong>
                <div className="ua-cfg-onb-pick-card__meta">
                  <span className={`ua-cfg-onb-pick-card__badge${entry.tag === "Untagged" ? " is-muted" : ""}`}>
                    {entry.tag}
                  </span>
                  <span>{entry.duration || (entry.live ? "Live" : "Draft")}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="ua-cfg-panel__sub">No coach videos are available to reuse yet.</p>
      )}
    </Panel>
  );
}

function CoachRoster({ coaches, selectedId, onSelect, pagination, onPageChange }) {
  return (
    <Panel
      title="Coach roster"
      subtitle="One row per wellness coach. Click a row to open that coach's video."
    >
      {coaches.length ? (
        <>
          <div className="ua-cfg-onb-roster-wrap">
            <table className="ua-cfg-onb-roster">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Coach</th>
                  <th>Video</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map((entry) => {
                  const videoLabel = entry.hasMedia
                    ? `${entry.displayTitle}${entry.duration ? ` · ${entry.duration}` : ""}`
                    : "No video yet · —";
                  return (
                    <tr
                      key={entry.id}
                      className={entry.id === selectedId ? "is-selected" : ""}
                      onClick={() => onSelect(entry.id)}
                    >
                      <td><span className="ua-cfg-onb-roster__tag">{entry.tag}</span></td>
                      <td><strong>{entry.name}</strong></td>
                      <td className={entry.hasMedia ? "" : "is-empty"}>{videoLabel}</td>
                      <td>
                        <span className={`ua-cfg-onb-roster__status ua-cfg-onb-roster__status--${entry.status}`}>
                          {statusLabel(entry.status).toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ListPagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            pageSize={pagination.limit}
            onPageChange={onPageChange}
            label="Onboarding coach pagination"
          />
        </>
      ) : (
        <p className="ua-cfg-panel__sub">No active wellness coaches found.</p>
      )}
    </Panel>
  );
}

function GalleryPanel({ gallery, selectedCoachId, onSelect, page, onPageChange }) {
  const [search, setSearch] = useState("");
  const owners = useMemo(
    () => ["All owners", ...Array.from(new Set(gallery.map((entry) => entry.owner).filter(Boolean)))],
    [gallery],
  );
  const [owner, setOwner] = useState("All owners");

  const filtered = useMemo(() => {
    return gallery.filter((entry) => {
      const matchesSearch = (entry.displayTitle || entry.title).toLowerCase().includes(search.trim().toLowerCase());
      const matchesOwner = owner === "All owners" || entry.owner === owner;
      return matchesSearch && matchesOwner;
    });
  }, [gallery, owner, search]);

  const pages = Math.max(1, Math.ceil(filtered.length / ONBOARDING_PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const paged = filtered.slice((safePage - 1) * ONBOARDING_PAGE_SIZE, safePage * ONBOARDING_PAGE_SIZE);

  useEffect(() => {
    if (page > pages) onPageChange(pages);
  }, [onPageChange, page, pages]);

  return (
    <Panel
      title="Gallery"
      subtitle="Videos currently attached to wellness coaches on this page. Open a card to edit that coach."
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
          {owners.map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
      </div>

      <div className="ua-cfg-mv-gallery__bar">
        <span>{filtered.length} of {gallery.length} items</span>
      </div>

      {paged.length ? (
        <div className="ua-cfg-mv-gallery__grid">
          {paged.map((entry) => {
            const isSelected = selectedCoachId === entry.id;
            return (
              <article key={entry.id} className={`ua-cfg-mv-gallery-card${isSelected ? " is-selected" : ""}`}>
                <button type="button" className="ua-cfg-mv-gallery-card__thumb" onClick={() => onSelect(entry.id)}>
                  <span className="ua-cfg-mv-gallery-card__type">Video</span>
                  <VideoThumb item={entry} />
                  {entry.duration ? <span className="ua-cfg-mv-gallery-card__duration">{entry.duration}</span> : null}
                </button>
                <div className="ua-cfg-mv-gallery-card__body">
                  <strong>{entry.displayTitle || entry.title}</strong>
                  <span>{entry.owner}</span>
                  <span>{entry.versions ? `${entry.versions} versions` : "No versions yet"}</span>
                </div>
                <div className="ua-cfg-mv-gallery-card__live">
                  <span className={`ua-cfg-mv-gallery-card__status${entry.live ? " is-live" : ""}`}>
                    {entry.live ? "Live" : "Not live"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="ua-cfg-panel__sub">No videos uploaded yet.</p>
      )}

      <ListPagination
        page={safePage}
        pages={pages}
        total={filtered.length}
        pageSize={ONBOARDING_PAGE_SIZE}
        onPageChange={onPageChange}
        label="Onboarding gallery pagination"
      />
    </Panel>
  );
}

const EMPTY_PAGINATION = { page: 1, limit: ONBOARDING_PAGE_SIZE, total: 0, pages: 1 };

export function OnboardingVideoSection({
  coaches,
  setCoaches,
  selectedCoachId,
  setSelectedCoachId,
  onToast,
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [galleryPage, setGalleryPage] = useState(1);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const selectedCoach = coaches.find((entry) => entry.id === selectedCoachId) ?? coaches[0];
  const stats = useMemo(() => buildOnboardingStats(coaches, pagination.total), [coaches, pagination.total]);
  const alert = useMemo(() => buildOnboardingAlert(coaches), [coaches]);
  const gallery = useMemo(
    () =>
      coaches
        .filter((entry) => entry.hasMedia || entry.videoUrl || entry.linkUrl)
        .map((entry) => ({
          ...entry,
          title: entry.displayTitle || entry.title || `Coach intro — ${entry.name}`,
          owner: entry.name,
          versions: entry.version,
        })),
    [coaches],
  );

  const applyAccount = useCallback((account) => {
    if (!account) return null;
    setCoaches((prev) => prev.map((entry) => (entry.id === account.id ? mergeOnboardingCoach(entry, account) : entry)));
    return account;
  }, [setCoaches]);

  const loadCoaches = useCallback(async (nextPage = page) => {
    setLoading(true);
    try {
      const result = await listOnboardingCoaches({ page: nextPage, limit: ONBOARDING_PAGE_SIZE });
      const rows = result?.coaches || [];
      const nextPagination = result?.pagination || { ...EMPTY_PAGINATION, page: nextPage, total: rows.length };
      setCoaches(rows);
      setPagination(nextPagination);
      setSelectedCoachId((current) => {
        if (current && rows.some((entry) => entry.id === current)) return current;
        return rows[0]?.id || "";
      });
    } catch (error) {
      onToast(error?.message || "Failed to load onboarding videos");
      setCoaches([]);
      setPagination(EMPTY_PAGINATION);
    } finally {
      setLoading(false);
    }
  }, [onToast, page, setCoaches, setSelectedCoachId]);

  useEffect(() => {
    loadCoaches(page);
  }, [loadCoaches, page]);

  async function runSave(work, successMessage) {
    if (busy || !selectedCoach) return null;
    setBusy(true);
    try {
      const account = await work();
      applyAccount(account);
      if (successMessage) onToast(successMessage);
      return account;
    } catch (error) {
      onToast(error?.message || "Failed to save onboarding video");
      return null;
    } finally {
      setBusy(false);
    }
  }

  if (loading && !coaches.length) {
    return (
      <div className="ua-cfg-onb">
        <Panel title="Onboarding video · one per coach" subtitle="Loading wellness coaches from Accounts…">
          <p className="ua-cfg-panel__sub">Fetching intro videos for each coach…</p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="ua-cfg-onb">
      <StatsPanel stats={stats} alert={alert} />
      {selectedCoach ? (
        <CoachEditor
          key={selectedCoach.id}
          coach={selectedCoach}
          busy={busy}
          onToast={onToast}
          onSaveCopy={(next) => runSave(() => saveCoachIntroCopy(selectedCoach.id, next), "Onboarding video saved")}
          onSaveLink={(url) => runSave(() => saveCoachIntroLink(selectedCoach.id, url), "Video link saved")}
          onSaveVideo={(file) => runSave(() => saveCoachIntroVideo(selectedCoach.id, file), "Video attached")}
          onSaveCover={(file) => runSave(() => saveCoachIntroCover(selectedCoach.id, file), "Cover attached")}
          onToggleLive={(live) =>
            runSave(
              () => saveCoachIntroLive(selectedCoach.id, live),
              live ? "Onboarding video is live" : "Onboarding video hidden",
            )
          }
        />
      ) : null}
      {selectedCoach ? (
        <PickFromGallery
          coach={selectedCoach}
          picks={gallery}
          busy={busy}
          onPick={(pick) =>
            runSave(() => saveCoachIntroGalleryPick(selectedCoach.id, pick.id), `Tagged ${pick.title} to ${selectedCoach.name}`)
          }
        />
      ) : null}
      <CoachRoster
        coaches={coaches}
        selectedId={selectedCoachId}
        onSelect={setSelectedCoachId}
        pagination={pagination}
        onPageChange={setPage}
      />
      <GalleryPanel
        gallery={gallery}
        selectedCoachId={selectedCoachId}
        onSelect={setSelectedCoachId}
        page={galleryPage}
        onPageChange={setGalleryPage}
      />
    </div>
  );
}

export {
  ONBOARDING_COACHES,
  ONBOARDING_GALLERY,
};
