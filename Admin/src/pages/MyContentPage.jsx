import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { fetchAccessRoles } from "../api/accessApi.js";
import { ROLE_KEY_TO_UI, UI_TO_ROLE_KEY } from "../api/accountApi.js";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { BackLink, OrangeButton, PillTabs } from "../components/shared.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";
import {
  listMyContentCoaches,
  mapAccountToMyContentCoach,
  saveCoachIntroLive,
  saveCoachIntroVideo,
  saveCoachLetterFile,
  saveCoachLetterLive,
  validateIntroVideoFile,
  validateLetterPdfFile,
  videoPreviewSrc,
} from "../api/coachContentApi.js";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";

const CONTENT_ROLE_UI_KEYS = new Set(["wc", "awc", "trainee"]);

const FALLBACK_ROLE_TABS = [
  { id: "wellness_coach", label: "Wellness Coach", roleKey: "wellness_coach" },
  { id: "assistant_wellness_coach", label: "Assistant WC", roleKey: "assistant_wellness_coach" },
  { id: "trainee", label: "Trainee", roleKey: "trainee" },
];

function resolveBaseUiRoleKey(role, allRoles) {
  const byId = Object.fromEntries((allRoles || []).map((row) => [row.id, row]));
  let current = role;
  const seen = new Set();
  while (current) {
    const currentId = current.id || current.roleKey;
    if (!currentId || seen.has(currentId)) break;
    seen.add(currentId);
    const key = String(current.roleKey || "").toLowerCase();
    if (UI_TO_ROLE_KEY[key]) return key;
    if (ROLE_KEY_TO_UI[key]) return ROLE_KEY_TO_UI[key];
    current = current.inheritsFromRoleId ? byId[current.inheritsFromRoleId] : null;
  }
  return null;
}

function contentRoleTabs(accessRoles) {
  const live = (accessRoles || [])
    .filter((role) => {
      const base = resolveBaseUiRoleKey(role, accessRoles);
      return CONTENT_ROLE_UI_KEYS.has(base);
    })
    .map((role) => ({
      id: role.id || role.roleKey,
      label: role.name || role.roleKey,
      roleKey:
        role.roleKey ||
        UI_TO_ROLE_KEY[resolveBaseUiRoleKey(role, accessRoles)] ||
        role.id,
      count: Number(role.memberCount) || 0,
    }));
  return live.length ? live : FALLBACK_ROLE_TABS;
}

function ContentToggle({ live, disabled, onChange }) {
  return (
    <button
      type="button"
      className={`ua-my-content__toggle${live ? " ua-my-content__toggle--on" : ""}`}
      aria-pressed={live}
      aria-label={live ? "Live in app" : "Hidden in app"}
      disabled={disabled}
      onClick={onChange}
    >
      <span className="ua-my-content__toggle-knob" />
    </button>
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

function LetterPreview({ item }) {
  return (
    <div className="ua-profile-preview__letter">
      <p className="ua-profile-preview__kicker">v{item.version || 1}</p>
      <div className="ua-profile-preview__letter-text">
        {item.text?.trim() || "The current commitment letter text is not available yet."}
      </div>
      {item.signedAt ? (
        <p className="ua-profile-preview__meta">
          Signed {new Date(item.signedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      ) : null}
      {item.fileUrl ? (
        <iframe title="Signed commitment letter" className="ua-profile-preview__pdf" src={item.fileUrl} />
      ) : (
        <p className="ua-profile-preview__empty">Upload a signed PDF to attach it here.</p>
      )}
      {item.fileUrl ? (
        <a className="ua-profile-modal__upload" href={item.fileUrl} target="_blank" rel="noreferrer">
          Open signed PDF
        </a>
      ) : null}
    </div>
  );
}

export function MyContentPage() {
  const { showToast } = useOutletContext();
  const { viewAs, account } = useViewAs();
  const [coaches, setCoaches] = useState([]);
  const [letterConfig, setLetterConfig] = useState({ text: "", version: 1 });
  const [accessRoles, setAccessRoles] = useState([]);
  const [roleTab, setRoleTab] = useState(FALLBACK_ROLE_TABS[0].id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);
  const [busyKey, setBusyKey] = useState("");
  const [preview, setPreview] = useState(null);
  const videoRef = useRef(null);
  const letterRef = useRef(null);
  const uploadTarget = useRef(null);

  const tabs = useMemo(() => contentRoleTabs(accessRoles), [accessRoles]);
  const activeTab = tabs.find((tab) => tab.id === roleTab) || tabs[0];
  const apiRoleKey = UI_TO_ROLE_KEY[activeTab?.roleKey] || activeTab?.roleKey || "wellness_coach";

  useEffect(() => {
    if (viewAs !== "admin") return undefined;
    let cancelled = false;
    fetchAccessRoles()
      .then((roles) => {
        if (!cancelled) setAccessRoles(Array.isArray(roles) ? roles : []);
      })
      .catch(() => {
        if (!cancelled) setAccessRoles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [viewAs]);

  useEffect(() => {
    if (!tabs.length) return;
    if (tabs.some((tab) => tab.id === roleTab)) return;
    const preferred = tabs.find((tab) => {
      const key = UI_TO_ROLE_KEY[tab.roleKey] || tab.roleKey;
      return key === "wellness_coach";
    });
    setRoleTab(preferred?.id || tabs[0].id);
  }, [roleTab, tabs]);

  useEffect(() => {
    if (viewAs !== "admin" || !apiRoleKey) return undefined;
    let cancelled = false;
    async function loadMembers() {
      setLoading(true);
      setError("");
      try {
        const result = await listMyContentCoaches({ roleKey: apiRoleKey });
        if (cancelled) return;
        setCoaches(result.coaches || []);
        setLetterConfig(result.letterConfig || { text: "", version: 1 });
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
  }, [apiRoleKey, reloadNonce, viewAs]);

  const load = useCallback(() => {
    setReloadNonce((n) => n + 1);
  }, []);

  if (viewAs !== "admin") {
    const ownId = account?.id;
    if (!ownId) return <Navigate to={UPDATED_ADMIN_PATHS.dashboard} replace />;
    return <Navigate to={UPDATED_ADMIN_PATHS.commitmentLetters(ownId)} replace />;
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
      const nextAccount = await work();
      applyAccount(accountId, nextAccount);
      if (successMessage) showToast(successMessage);
    } catch (err) {
      showToast(err?.message || "Could not update content");
    } finally {
      setBusyKey("");
    }
  }

  function toggleItem(coach, item) {
    if (!item.hasMedia) {
      showToast(item.kind === "video" ? "Upload a video before going live" : "Upload a signed letter before going live");
      return;
    }
    const nextLive = !item.live;
    if (item.kind === "video") {
      runSave(
        coach.id,
        item.id,
        () => saveCoachIntroLive(coach.id, nextLive),
        nextLive ? `${coach.name}'s intro video is live in the app` : `${coach.name}'s intro video is hidden`,
      );
      return;
    }
    runSave(
      coach.id,
      item.id,
      () => saveCoachLetterLive(coach.id, nextLive),
      nextLive ? `${coach.name}'s commitment letter is live in the app` : `${coach.name}'s commitment letter is hidden`,
    );
  }

  function startUpload(coach, item) {
    uploadTarget.current = { coachId: coach.id, kind: item.kind };
    if (item.kind === "letter") letterRef.current?.click();
    else videoRef.current?.click();
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
    runSave(coachId, "intro", () => saveCoachIntroVideo(coachId, file), `Intro video uploaded for ${coach?.name || "coach"}`);
  }

  function handleLetterSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    const coachId = uploadTarget.current?.coachId;
    uploadTarget.current = null;
    if (!file || !coachId) return;
    const invalid = validateLetterPdfFile(file);
    if (invalid) {
      showToast(invalid);
      return;
    }
    const coach = coaches.find((row) => row.id === coachId);
    runSave(coachId, "letter", () => saveCoachLetterFile(coachId, file), `Commitment letter uploaded for ${coach?.name || "coach"}`);
  }

  function viewItem(coach, item) {
    if (!item.hasMedia) {
      showToast(item.kind === "video" ? "No intro video uploaded yet" : "No commitment letter uploaded yet");
      return;
    }
    setPreview({ coachId: coach.id, kind: item.kind });
  }

  const previewCoach = preview ? coaches.find((coach) => coach.id === preview.coachId) : null;
  const previewItem = previewCoach?.items.find((item) => item.kind === preview?.kind);

  return (
    <main className="content ua-page-enter ua-my-content">
      <BackLink label="Dashboard" />
      <div className="ua-my-content__head">
        <div>
          <h1 className="page-head__title">My Content</h1>
          <p className="page-head__sub">
            Intro videos and commitment letters for every coach. Upload, replace or hide any of them.
          </p>
        </div>
      </div>

      <div className="ua-my-content__tabs">
        <PillTabs tabs={tabs} active={activeTab?.id || roleTab} onChange={setRoleTab} />
      </div>

      {loading ? <BrandLoader variant="page" label="Loading coach content…" /> : null}
      {error ? (
        <div className="ua-section-bar">
          <span>{error}</span>
          <OrangeButton onClick={load}>Retry</OrangeButton>
        </div>
      ) : null}

      {!loading && !error && !coaches.length ? (
        <p className="page-head__sub">No people in this role yet.</p>
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
                    {coach.clients != null ? ` · ${coach.clients} clients` : ""}
                  </div>
                </div>
                <span className="ua-my-content__live-badge">{coach.liveLabel}</span>
              </div>

              {coach.items.map((item) => {
                const busy = busyKey === `${coach.id}:${item.id}`;
                return (
                  <div key={item.id} className="ua-my-content__item">
                    <span className="ua-my-content__item-icon" aria-hidden="true">
                      {item.kind === "video" ? "🎥" : "📄"}
                    </span>
                    <div className="ua-my-content__item-copy">
                      <div className="ua-my-content__item-title">{item.title}</div>
                      <div className="ua-my-content__item-meta">{item.meta}</div>
                    </div>
                    {item.hasMedia ? (
                      <span
                        className={`ua-my-content__item-status${item.live ? " is-live" : " is-hidden"}`}
                      >
                        {item.live ? "LIVE IN APP" : "HIDDEN"}
                      </span>
                    ) : null}
                    <div className="ua-my-content__item-actions">
                      <button
                        type="button"
                        className="ua-my-content__btn ua-my-content__btn--ghost"
                        disabled={busy}
                        onClick={() => viewItem(coach, item)}
                      >
                        {item.secondaryAction}
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
                );
              })}
            </section>
          ))}
        </div>
      ) : null}

      <input ref={videoRef} type="file" accept="video/*" hidden onChange={handleVideoSelected} />
      <input ref={letterRef} type="file" accept="application/pdf,.pdf" hidden onChange={handleLetterSelected} />

      <ContentPreviewModal
        open={Boolean(previewItem)}
        title={previewItem ? `${previewCoach.name} · ${previewItem.title}` : ""}
        onClose={() => setPreview(null)}
      >
        {previewItem?.kind === "video" ? <VideoPreview item={previewItem} /> : null}
        {previewItem?.kind === "letter" ? <LetterPreview item={previewItem} /> : null}
      </ContentPreviewModal>
    </main>
  );
}
