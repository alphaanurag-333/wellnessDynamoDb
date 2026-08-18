import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { accountUpdateMe } from "../api/accountApi.js";
import {
  buildCoachProfileContent,
  getMyCoachContent,
  saveMyIntroLive,
  saveMyIntroVideo,
  saveMyLetterFile,
  saveMyLetterLive,
  validateIntroVideoFile,
  validateLetterPdfFile,
  videoPreviewSrc,
} from "../api/coachContentApi.js";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { buildProfileFromAccount } from "../data/profileData.js";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { useAppSelector } from "../store/hooks.js";
import { selectAdminProfile } from "../store/slices/adminProfileSlice.js";

function ReadOnlyField({ label, value, hint }) {
  return (
    <label className="ua-profile-modal__field">
      <span className="ua-profile-modal__label">{label}</span>
      <input type="text" className="ua-profile-modal__input" value={value || "—"} readOnly />
      {hint ? <span className="ua-profile-modal__hint">{hint}</span> : null}
    </label>
  );
}

function AvatarMark({ profile, className }) {
  if (profile.profileImage) {
    return (
      <span className={`${className} ${className}--image`} aria-hidden="true">
        <img src={profile.profileImage} alt="" />
      </span>
    );
  }
  return (
    <span className={className} aria-hidden="true">
      {profile.initial}
    </span>
  );
}

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

function ContentPreviewModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div
      className="ua-team-modal-backdrop ua-team-modal-backdrop--stack"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
      role="presentation"
    >
      <div className="ua-profile-preview" onClick={(event) => event.stopPropagation()} role="dialog" aria-label={title}>
        <div className="ua-profile-preview__head">
          <strong>{title}</strong>
          <button type="button" className="ua-team-modal__close" onClick={onClose} aria-label="Close">×</button>
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

function CoachContentCard({ video, letter, busy, onToggle, onView, onUpload }) {
  const items = [video, letter].filter(Boolean);
  return (
    <section className="ua-profile-modal__card">
      <div className="ua-profile-modal__card-head ua-profile-modal__card-head--stack">
        <div className="ua-profile-modal__card-title">My content</div>
        <div className="ua-profile-modal__card-hint ua-profile-modal__card-hint--left">
          Your own intro video and commitment letter. Turn one on to show it to your clients.
        </div>
      </div>
      <div className="ua-profile-modal__content-list">
        {items.map((item) => (
          <div key={item.id} className="ua-profile-modal__content-item">
            <span
              className={`ua-profile-modal__content-icon${item.kind === "letter" ? " is-letter" : " is-video"}`}
              aria-hidden="true"
            >
              {item.kind === "video" ? "🎥" : "📄"}
            </span>
            <div className="ua-profile-modal__content-copy">
              <div className="ua-profile-modal__content-title">{item.title}</div>
              <div className="ua-profile-modal__content-meta">{item.meta}</div>
            </div>
            {item.live ? <span className="ua-profile-modal__content-live">LIVE IN APP</span> : null}
            <div className="ua-profile-modal__content-actions">
              <button
                type="button"
                className="ua-profile-modal__upload"
                disabled={busy}
                onClick={() => onView(item)}
              >
                View
              </button>
              <button
                type="button"
                className="ua-profile-modal__upload"
                disabled={busy}
                onClick={() => onUpload(item)}
              >
                {item.kind === "video" ? (item.hasMedia ? "Replace" : "Upload") : item.hasMedia ? "Replace" : "Upload"}
              </button>
              <ContentToggle
                live={item.live}
                disabled={busy || !item.hasMedia}
                onChange={() => onToggle(item)}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const EMPTY_CONTENT = buildCoachProfileContent(null);

export function ProfileModal({ open, onClose, onToast }) {
  const navigate = useNavigate();
  const { account, activeRole, setAccount } = useViewAs();
  const storedProfile = useAppSelector(selectAdminProfile);
  const profile = useMemo(
    () => buildProfileFromAccount(storedProfile || account, activeRole),
    [account, activeRole, storedProfile],
  );
  const [bio, setBio] = useState(profile.bio);
  const [savingBio, setSavingBio] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [contentBusy, setContentBusy] = useState(false);
  const [content, setContent] = useState(EMPTY_CONTENT);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const letterRef = useRef(null);
  const bioBaseline = useRef(profile.bio);
  const letterConfigRef = useRef({ text: "", version: 1, templateUrl: "" });

  function mergeCoachAccount(nextAccount) {
    if (!nextAccount) return;
    const current = storedProfile || account || {};
    setAccount({
      ...current,
      ...nextAccount,
      coach_content: nextAccount.coach_content || current.coach_content,
      activeRole: current.activeRole || nextAccount.activeRole,
      activeRoleUi: current.activeRoleUi || nextAccount.activeRoleUi,
      roles: current.roles || nextAccount.roles,
      permissions: current.permissions || nextAccount.permissions,
      dataScope: current.dataScope || nextAccount.dataScope,
      isSuperAdmin: current.isSuperAdmin ?? nextAccount.isSuperAdmin,
    });
  }

  function applyContent(nextAccount, letterConfig) {
    if (letterConfig) letterConfigRef.current = letterConfig;
    mergeCoachAccount(nextAccount);
    setContent(buildCoachProfileContent(nextAccount || storedProfile || account, letterConfigRef.current));
  }

  useEffect(() => {
    if (!open) return;
    setBio(profile.bio);
    bioBaseline.current = profile.bio;
    setPreview(null);
    if (!profile.isCoach) return undefined;

    let cancelled = false;
    setContent(buildCoachProfileContent(storedProfile || account));
    getMyCoachContent()
      .then((payload) => {
        if (cancelled) return;
        applyContent(payload.account, payload.letter);
      })
      .catch((error) => {
        if (!cancelled) onToast?.(error?.message || "Could not load your content");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile.bio, profile.id, profile.isCoach]);

  if (!open) return null;

  function openContentLibrary() {
    onClose();
    navigate(UPDATED_ADMIN_PATHS.myContent);
  }

  async function saveBioIfChanged() {
    const next = String(bio || "").trim();
    const prev = String(bioBaseline.current || "").trim();
    if (next === prev) return;
    setSavingBio(true);
    try {
      const updated = await accountUpdateMe({ bio: next });
      setAccount(updated);
      bioBaseline.current = next;
      onToast?.("Bio saved");
    } catch (error) {
      onToast?.(error?.message || "Could not save bio");
      setBio(bioBaseline.current);
    } finally {
      setSavingBio(false);
    }
  }

  async function handlePhotoSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onToast?.("Please choose an image file");
      return;
    }
    setUploading(true);
    try {
      const updated = await accountUpdateMe({}, file);
      setAccount(updated);
      onToast?.("Display photo updated");
    } catch (error) {
      onToast?.(error?.message || "Could not upload photo");
    } finally {
      setUploading(false);
    }
  }

  async function runContentSave(work, successMessage) {
    if (contentBusy) return;
    setContentBusy(true);
    try {
      const payload = await work();
      applyContent(payload?.account, payload?.letter);
      if (successMessage) onToast?.(successMessage);
    } catch (error) {
      onToast?.(error?.message || "Could not update content");
    } finally {
      setContentBusy(false);
    }
  }

  function toggleContent(item) {
    if (!item.hasMedia) {
      onToast?.(item.kind === "video" ? "Upload a video before going live" : "Upload a signed letter before going live");
      return;
    }
    const nextLive = !item.live;
    if (item.kind === "video") {
      runContentSave(() => saveMyIntroLive(nextLive), nextLive ? "Intro video is live in the app" : "Intro video hidden from clients");
      return;
    }
    runContentSave(() => saveMyLetterLive(nextLive), nextLive ? "Commitment letter is live in the app" : "Commitment letter hidden from clients");
  }

  function handleVideoSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const invalid = validateIntroVideoFile(file);
    if (invalid) {
      onToast?.(invalid);
      return;
    }
    runContentSave(() => saveMyIntroVideo(file), "Intro video uploaded");
  }

  function handleLetterSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const invalid = validateLetterPdfFile(file);
    if (invalid) {
      onToast?.(invalid);
      return;
    }
    runContentSave(() => saveMyLetterFile(file), "Signed letter uploaded");
  }

  return (
    <div className="ua-team-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="ua-profile-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="profile-modal-title"
      >
        <div className="ua-profile-modal__hero">
          <AvatarMark profile={profile} className="ua-profile-modal__avatar" />
          <div className="ua-profile-modal__hero-copy">
            <div id="profile-modal-title" className="ua-profile-modal__name">{profile.name}</div>
            <div className="ua-profile-modal__role-line">
              {profile.role} · {profile.email}
            </div>
          </div>
          <button type="button" className="ua-team-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ua-profile-modal__body">
          <section className="ua-profile-modal__card">
            <div className="ua-profile-modal__card-head">
              <div className="ua-profile-modal__card-title">Your details</div>
              <div className="ua-profile-modal__card-hint">
                Details are set by admin — you can change your photo
              </div>
            </div>
            <div className="ua-profile-modal__grid">
              <ReadOnlyField label="Full name" value={profile.name} />
              <ReadOnlyField label="WhatsApp number" value={profile.whatsapp} hint={profile.whatsappHint} />
              <ReadOnlyField label="Work email" value={profile.email} />
              <ReadOnlyField label="Role" value={`${profile.role} · ${profile.roleNote}`} />
            </div>
            <ReadOnlyField label="Address" value={profile.address} />

            <div className="ua-profile-modal__photo-row">
              <AvatarMark profile={profile} className="ua-profile-modal__photo-avatar" />
              <div className="ua-profile-modal__photo-copy">
                <div className="ua-profile-modal__photo-title">Display photo</div>
                <div className="ua-profile-modal__photo-sub">Shown to clients beside your messages.</div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handlePhotoSelected}
              />
              <button
                type="button"
                className="ua-profile-modal__upload"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>
          </section>

          <section className="ua-profile-modal__card">
            <div className="ua-profile-modal__card-head ua-profile-modal__card-head--stack">
              <div className="ua-profile-modal__card-title">About you</div>
              <div className="ua-profile-modal__card-hint ua-profile-modal__card-hint--left">
                A short bio clients see on your profile.
              </div>
            </div>
            <textarea
              className="ua-profile-modal__bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              onBlur={saveBioIfChanged}
              rows={3}
              disabled={savingBio}
              placeholder="Add a short bio…"
            />
          </section>

          {profile.isCoach ? (
            <>
              <CoachContentCard
                video={content.video}
                letter={content.letter}
                busy={contentBusy}
                onToggle={toggleContent}
                onView={(item) => setPreview(item.kind)}
                onUpload={(item) => {
                  if (item.kind === "letter") letterRef.current?.click();
                  else videoRef.current?.click();
                }}
              />
              <input
                ref={videoRef}
                type="file"
                accept="video/*"
                hidden
                onChange={handleVideoSelected}
              />
              <input
                ref={letterRef}
                type="file"
                accept="application/pdf"
                hidden
                onChange={handleLetterSelected}
              />
            </>
          ) : (
            <>
              <button type="button" className="ua-profile-modal__library" onClick={openContentLibrary}>
                <span className="ua-profile-modal__library-icon" aria-hidden="true">🎥</span>
                <span className="ua-profile-modal__library-copy">
                  <span className="ua-profile-modal__library-title">Coach content library</span>
                  <span className="ua-profile-modal__library-sub">
                    Intro videos and commitment letters for every wellness coach and assistant.
                  </span>
                </span>
                <span className="ua-profile-modal__library-open">Open →</span>
              </button>

              <section className="ua-profile-modal__card">
                <div className="ua-profile-modal__card-title">Account</div>
                <div className="ua-profile-modal__account-rows">
                  <div className="ua-profile-modal__account-row">
                    <span>Role</span>
                    <span>{profile.role}</span>
                  </div>
                  <div className="ua-profile-modal__account-row">
                    <span>Member since</span>
                    <span>{profile.memberSince}</span>
                  </div>
                  <div className="ua-profile-modal__account-row">
                    <span>Last sign-in</span>
                    <span>{profile.lastSignIn}</span>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      <ContentPreviewModal
        open={preview === "video"}
        title="My intro video"
        onClose={() => setPreview(null)}
      >
        <VideoPreview item={content.video} />
      </ContentPreviewModal>
      <ContentPreviewModal
        open={preview === "letter"}
        title="My commitment letter"
        onClose={() => setPreview(null)}
      >
        <LetterPreview item={content.letter} />
      </ContentPreviewModal>
    </div>
  );
}
