import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useOutletContext } from "react-router-dom";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { IconVideo } from "../components/DashboardIcons.jsx";
import { BackLink, OrangeButton } from "../components/shared.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";
import {
  getMyCoachContent,
  listMyContentCoaches,
  mapAccountToMyContentCoach,
  saveCoachIntroLive,
  saveCoachIntroVideo,
  saveCoachLetterLive,
  saveMyIntroLive,
  saveMyIntroVideo,
  saveMyLetterLive,
  validateIntroVideoFile,
  videoPreviewSrc,
} from "../api/coachContentApi.js";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";

const COACH_VIEW_ROLES = new Set(["wc", "awc", "trainee"]);

function ContentToggle({ live, disabled, onChange }) {
  return (
    <button
      type="button"
      className={`ua-toggle ua-toggle--sm${live ? " ua-toggle--on" : ""}`}
      aria-pressed={live}
      aria-label={live ? "Live in app" : "Hidden in app"}
      disabled={disabled}
      onClick={onChange}
    >
      <span className="ua-toggle__knob" />
    </button>
  );
}

function ContentFileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  );
}

function ContentPreviewModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div
      className="ua-team-modal-backdrop ua-team-modal-backdrop--stack"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ua-profile-preview"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="ua-profile-preview__head">
          <strong>{title}</strong>
          <button type="button" className="ua-team-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ua-profile-preview__body">{children}</div>
      </div>
    </div>
  );
}

function VideoPreview({ item }) {
  const preview = videoPreviewSrc(item);
  if (!preview) {
    return <p className="ua-profile-preview__empty">No intro video uploaded yet.</p>;
  }
  return (
    <>
      <div className="ua-profile-preview__media">
        {preview.type === "iframe" ? (
          <iframe title={item.title} src={preview.src} allow="autoplay; fullscreen" allowFullScreen />
        ) : (
          <video src={preview.src} controls poster={item.coverUrl || undefined} />
        )}
      </div>
      {item.description ? <p className="ua-profile-preview__copy">{item.description}</p> : null}
    </>
  );
}

export function MyContentPage() {
  const { showToast } = useOutletContext();
  const navigate = useNavigate();
  const { viewAs, account } = useViewAs();
  const isAdmin = viewAs === "admin";
  const isCoachView = COACH_VIEW_ROLES.has(viewAs);
  const [coaches, setCoaches] = useState([]);
  const [letterConfig, setLetterConfig] = useState({ text: "", version: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);
  const [busyKey, setBusyKey] = useState("");
  const [preview, setPreview] = useState(null);
  const videoRef = useRef(null);
  const uploadTarget = useRef(null);

  useEffect(() => {
    if (!isAdmin && !isCoachView) return undefined;
    let cancelled = false;
    async function loadMembers() {
      setLoading(true);
      setError("");
      try {
        if (isAdmin) {
          const result = await listMyContentCoaches();
          if (cancelled) return;
          setCoaches(result.coaches || []);
          setLetterConfig(result.letterConfig || { text: "", version: 1 });
        } else {
          const payload = await getMyCoachContent();
          if (cancelled) return;
          const nextAccount = payload?.account || account;
          const config = payload?.letter || { text: "", version: 1 };
          setLetterConfig(config);
          setCoaches(nextAccount ? [mapAccountToMyContentCoach(nextAccount, config, 0)] : []);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "Could not load coach content");
        setCoaches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadMembers();
    return () => {
      cancelled = true;
    };
  }, [account, isAdmin, isCoachView, reloadNonce]);

  const load = useCallback(() => {
    setReloadNonce((n) => n + 1);
  }, []);

  if (!isAdmin && !isCoachView) {
    return <Navigate to={UPDATED_ADMIN_PATHS.dashboard} replace />;
  }

  if (!isAdmin && !account?.id) {
    return <Navigate to={UPDATED_ADMIN_PATHS.dashboard} replace />;
  }

  function applyAccount(accountId, nextAccount) {
    if (!nextAccount) return;
    setCoaches((prev) =>
      prev.map((coach, index) =>
        coach.id === accountId ? mapAccountToMyContentCoach(nextAccount, letterConfig, index) : coach,
      ),
    );
  }

  async function runSave(accountId, itemId, work, successMessage) {
    const key = `${accountId}:${itemId}`;
    if (busyKey) return;
    setBusyKey(key);
    try {
      const result = await work();
      const nextAccount = result?.account || result;
      applyAccount(accountId, nextAccount);
      if (successMessage) showToast(successMessage);
    } catch (err) {
      showToast(err?.message || "Could not update content");
    } finally {
      setBusyKey("");
    }
  }

  function openLetters(coach) {
    navigate(UPDATED_ADMIN_PATHS.commitmentLetters(coach.id));
  }

  function toggleItem(coach, item) {
    if (!item.hasMedia) {
      showToast(item.kind === "video" ? "Upload a video before going live" : "Upload a signed letter before going live");
      return;
    }
    const nextLive = !item.live;
    const own = !isAdmin && coach.id === account?.id;
    if (item.kind === "video") {
      runSave(
        coach.id,
        item.id,
        () => (own ? saveMyIntroLive(nextLive) : saveCoachIntroLive(coach.id, nextLive)),
        nextLive
          ? own
            ? "Intro video is live in the app"
            : `${coach.name}'s intro video is live in the app`
          : own
            ? "Intro video is hidden"
            : `${coach.name}'s intro video is hidden`,
      );
      return;
    }
    runSave(
      coach.id,
      item.id,
      () => (own ? saveMyLetterLive(nextLive) : saveCoachLetterLive(coach.id, nextLive)),
      nextLive
        ? own
          ? "Commitment letter is live in the app"
          : `${coach.name}'s commitment letter is live in the app`
        : own
          ? "Commitment letter is hidden"
          : `${coach.name}'s commitment letter is hidden`,
    );
  }

  function startUpload(coach, item) {
    if (item.kind === "letter") {
      openLetters(coach);
      return;
    }
    uploadTarget.current = { coachId: coach.id, kind: item.kind };
    videoRef.current?.click();
  }

  function handleVideoSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    const coachId = uploadTarget.current?.coachId;
    uploadTarget.current = null;
    if (!file || !coachId) return;
    const invalid = validateIntroVideoFile(file);
    if (invalid) {
      showToast(invalid);
      return;
    }
    const coach = coaches.find((row) => row.id === coachId);
    const own = !isAdmin && coachId === account?.id;
    runSave(
      coachId,
      "intro",
      () => (own ? saveMyIntroVideo(file) : saveCoachIntroVideo(coachId, file)),
      own ? "Intro video uploaded" : `Intro video uploaded for ${coach?.name || "coach"}`,
    );
  }

  function viewItem(coach, item) {
    if (item.kind === "letter") {
      openLetters(coach);
      return;
    }
    if (!item.hasMedia) {
      showToast("No intro video uploaded yet");
      return;
    }
    setPreview({ coachId: coach.id, kind: item.kind });
  }

  const previewCoach = preview ? coaches.find((coach) => coach.id === preview.coachId) : null;
  const previewItem = previewCoach?.items.find((item) => item.kind === preview?.kind);
  const pageSubtitle = isAdmin
    ? "Intro videos and commitment letters for every coach. Upload, replace or hide any of them."
    : "Your intro video and commitment letter. Upload, replace or turn one on to show it to your clients.";

  return (
    <main className="content ua-page-enter ua-my-content">
      <BackLink label="Dashboard" />
      <div className="ua-my-content__head">
        <div>
          <h1 className="page-head__title">My Content</h1>
          <p className="page-head__sub">{pageSubtitle}</p>
        </div>
      </div>

      {loading ? <BrandLoader variant="page" label="Loading coach content…" /> : null}
      {error ? (
        <div className="ua-section-bar">
          <span>{error}</span>
          <OrangeButton onClick={load}>Retry</OrangeButton>
        </div>
      ) : null}

      {!loading && !error && !coaches.length ? (
        <p className="page-head__sub">{isAdmin ? "No coaches with content yet." : "Could not load your content yet."}</p>
      ) : null}

      {!loading && !error ? (
        <div className="ua-my-content__list">
          {coaches.map((coach) => (
            <section key={coach.id} className="ua-my-content__coach">
              <div className="ua-my-content__coach-head">
                <span className="ua-my-content__coach-avatar" style={{ background: coach.color }}>
                  {coach.initial}
                </span>
                <div className="ua-my-content__coach-copy">
                  <div className="ua-my-content__coach-name">{coach.name}</div>
                  <div className="ua-my-content__coach-meta">
                    {coach.role}
                    {coach.meta ? ` · ${coach.meta}` : ""}
                  </div>
                </div>
                <span className={`ua-my-content__live-badge${coach.liveCount ? "" : " is-empty"}`}>
                  {coach.liveLabel}
                </span>
              </div>

              <div className="ua-my-content__coach-body">
                {coach.items.map((item) => {
                  const busy = busyKey === `${coach.id}:${item.id}`;
                  return (
                    <div
                      key={item.id}
                      className={`ua-my-content__item${item.live ? " is-live" : ""}`}
                    >
                      <span className="ua-my-content__item-icon" aria-hidden="true">
                        {item.kind === "video" ? <IconVideo /> : <ContentFileIcon />}
                      </span>
                      <div className="ua-my-content__item-copy">
                        <div className="ua-my-content__item-title">
                          {isAdmin ? item.title : item.kind === "video" ? "My intro video" : "My commitment letter"}
                        </div>
                        <div className="ua-my-content__item-meta">{item.meta}</div>
                      </div>
                      <div className="ua-my-content__item-side">
                        <span
                          className={`ua-my-content__item-status${item.live ? " is-live" : " is-hidden"}`}
                        >
                          {item.hasMedia
                            ? item.live
                              ? "LIVE IN APP"
                              : "HIDDEN"
                            : "Not uploaded"}
                        </span>
                        <div className="ua-my-content__item-actions">
                          <button
                            type="button"
                            className="ua-my-content__btn ua-my-content__btn--ghost"
                            disabled={busy}
                            onClick={() => viewItem(coach, item)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="ua-my-content__btn ua-my-content__btn--primary"
                            disabled={busy}
                            onClick={() => startUpload(coach, item)}
                          >
                            {busy ? "Saving…" : item.primaryAction}
                          </button>
                          <ContentToggle
                            live={item.live}
                            disabled={busy || !item.hasMedia}
                            onChange={() => toggleItem(coach, item)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      <input ref={videoRef} type="file" accept="video/*" hidden onChange={handleVideoSelected} />

      <ContentPreviewModal
        open={Boolean(previewItem)}
        title={previewItem ? `${previewCoach.name} · ${previewItem.title}` : ""}
        onClose={() => setPreview(null)}
      >
        {previewItem?.kind === "video" ? <VideoPreview item={previewItem} /> : null}
      </ContentPreviewModal>
    </main>
  );
}
