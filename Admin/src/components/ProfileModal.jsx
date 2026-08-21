import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { accountChangePassword, accountUpdateMe } from "../api/accountApi.js";
import {
  buildCoachProfileContent,
  getMyCoachContent,
  saveMyIntroLink,
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
      <input type="text" className="ua-profile-modal__input is-readonly" value={value || "—"} readOnly />
      {hint ? <span className="ua-profile-modal__hint">{hint}</span> : null}
    </label>
  );
}

function EditableField({ label, value, onChange, hint, disabled, placeholder }) {
  return (
    <label className="ua-profile-modal__field">
      <span className="ua-profile-modal__label">{label}</span>
      <input
        type="text"
        className="ua-profile-modal__input ua-profile-modal__input--edit"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
      />
      {hint ? <span className="ua-profile-modal__hint">{hint}</span> : null}
    </label>
  );
}

function PhoneField({ countryCode, phone, onCountryCode, onPhone, hint, disabled }) {
  return (
    <label className="ua-profile-modal__field">
      <span className="ua-profile-modal__label">WhatsApp number</span>
      <div className="ua-profile-modal__phone">
        <input
          type="text"
          className="ua-profile-modal__input ua-profile-modal__input--edit ua-profile-modal__cc"
          value={countryCode}
          onChange={(event) => onCountryCode(event.target.value)}
          disabled={disabled}
          aria-label="Country code"
        />
        <input
          type="tel"
          className="ua-profile-modal__input ua-profile-modal__input--edit"
          value={phone}
          onChange={(event) => onPhone(event.target.value.replace(/[^\d]/g, ""))}
          disabled={disabled}
          placeholder="9820011002"
          inputMode="numeric"
        />
      </div>
      {hint ? <span className="ua-profile-modal__hint">{hint}</span> : null}
    </label>
  );
}

function EyeIcon({ off = false }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {off ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.9 5.1A9.8 9.8 0 0 1 12 5c7 0 10 7 10 7a13.4 13.4 0 0 1-3.2 3.9" />
          <path d="M6.1 6.1C3.7 7.8 2 12 2 12s3 7 10 7c1.7 0 3.2-.4 4.5-1" />
        </>
      ) : (
        <>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function PasswordField({ label, value, onChange, disabled, autoComplete }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="ua-profile-modal__field">
      <span className="ua-profile-modal__label">{label}</span>
      <div className="ua-profile-modal__password-wrap">
        <input
          type={visible ? "text" : "password"}
          className="ua-profile-modal__input ua-profile-modal__input--edit"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="ua-profile-modal__eye"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          <EyeIcon off={visible} />
        </button>
      </div>
    </label>
  );
}

function PasswordChangeModal({ open, busy, onClose, onSubmit }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  }, [open]);

  if (!open) return null;

  function handleSubmit() {
    if (!currentPassword || !newPassword) {
      setError("Enter your current and new password.");
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 15) {
      setError("New password must be 8–15 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setError("");
    onSubmit({ currentPassword, newPassword });
  }

  return (
    <div
      className="ua-team-modal-backdrop ua-team-modal-backdrop--stack"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
      role="presentation"
    >
      <div
        className="ua-profile-password-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="profile-password-title"
      >
        <div className="ua-cfg-mv-link-modal__head">
          <div>
            <h3 id="profile-password-title" className="ua-cfg-mv-link-modal__title">
              Change password
            </h3>
            <p className="ua-cfg-mv-link-modal__sub">Use 8–15 characters. You will stay signed in.</p>
          </div>
          <button type="button" className="ua-cfg-mv-link-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <PasswordField
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
          disabled={busy}
          autoComplete="current-password"
        />
        <PasswordField
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          disabled={busy}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          disabled={busy}
          autoComplete="new-password"
        />
        {error ? <p className="ua-profile-modal__form-error">{error}</p> : null}
        <div className="ua-cfg-mv-link-modal__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy} onClick={handleSubmit}>
            {busy ? "Saving…" : "Update password"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AvatarMark({ profile, className }) {
  if (profile.profileImage) {
    return (
      <img
        className={`${className} ${className}--image`}
        src={profile.profileImage}
        alt=""
        width="52"
        height="52"
        draggable="false"
      />
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

function IntroLinkModal({ open, title, initialUrl, busy, onClose, onSave }) {
  const [url, setUrl] = useState(initialUrl || "");

  useEffect(() => {
    if (open) setUrl(initialUrl || "");
  }, [initialUrl, open]);

  if (!open) return null;

  return (
    <div
      className="ua-team-modal-backdrop ua-team-modal-backdrop--stack"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ua-cfg-mv-link-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="ua-cfg-mv-link-modal__head">
          <div>
            <h3 className="ua-cfg-mv-link-modal__title">
              <span aria-hidden="true">🔗</span> Use a link
            </h3>
            <p className="ua-cfg-mv-link-modal__sub">{title} · YouTube or Vimeo URL</p>
          </div>
          <button
            type="button"
            className="ua-cfg-mv-link-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <input
          type="url"
          className="ua-cfg-mv-link-modal__input"
          placeholder="youtube.com/watch?v=… or vimeo.com/…"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          disabled={busy}
        />
        <div className="ua-cfg-mv-link-modal__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary"
            disabled={busy || !url.trim()}
            onClick={() => onSave(url.trim())}
          >
            {busy ? "Saving…" : "Save link"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CoachContentCard({ video, letter, busy, onToggle, onView, onUpload, onUseLink }) {
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
              {item.kind === "letter" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M8 13h8" />
                  <path d="M8 17h5" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
              )}
            </span>
            <div className="ua-profile-modal__content-copy">
              <div className="ua-profile-modal__content-title">{item.title}</div>
              <div className="ua-profile-modal__content-meta">{item.meta}</div>
            </div>
            <div className="ua-profile-modal__content-side">
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
                  {item.hasMedia ? "Replace" : "Upload"}
                </button>
                {item.kind === "video" ? (
                  <button
                    type="button"
                    className="ua-profile-modal__upload"
                    disabled={busy}
                    onClick={() => onUseLink(item)}
                  >
                    Use link
                  </button>
                ) : null}
                <ContentToggle
                  live={item.live}
                  disabled={busy || !item.hasMedia}
                  onChange={() => onToggle(item)}
                />
              </div>
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
  const [name, setName] = useState(profile.name === "—" ? "" : profile.name);
  const [phone, setPhone] = useState(profile.phoneDigits || "");
  const [phoneCountryCode, setPhoneCountryCode] = useState(profile.phoneCountryCode || "+91");
  const [address, setAddress] = useState(profile.address === "—" ? "" : profile.address);
  const [savingBio, setSavingBio] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [contentBusy, setContentBusy] = useState(false);
  const [content, setContent] = useState(EMPTY_CONTENT);
  const [preview, setPreview] = useState(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
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
    setName(profile.name === "—" ? "" : profile.name);
    setPhone(profile.phoneDigits || "");
    setPhoneCountryCode(profile.phoneCountryCode || "+91");
    setAddress(profile.address === "—" ? "" : profile.address);
    setPasswordOpen(false);
    setPreview(null);
    setLinkModalOpen(false);
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

  async function saveDetails() {
    const nextName = String(name || "").trim();
    if (!nextName) {
      onToast?.("Name is required");
      return;
    }
    setSavingDetails(true);
    try {
      const updated = await accountUpdateMe({
        name: nextName,
        phone: String(phone || "").trim(),
        phoneCountryCode: String(phoneCountryCode || "").trim() || "+91",
        address: String(address || "").trim(),
      });
      setAccount(updated);
      onToast?.("Profile saved");
    } catch (error) {
      onToast?.(error?.message || "Could not save profile");
    } finally {
      setSavingDetails(false);
    }
  }

  async function savePassword({ currentPassword, newPassword }) {
    setPasswordBusy(true);
    try {
      await accountChangePassword({ currentPassword, newPassword });
      setPasswordOpen(false);
      onToast?.("Password updated");
    } catch (error) {
      onToast?.(error?.message || "Could not change password");
    } finally {
      setPasswordBusy(false);
    }
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

  function handleIntroLinkSave(url) {
    if (!url) {
      onToast?.("Enter a video link");
      return;
    }
    runContentSave(async () => {
      const payload = await saveMyIntroLink(url);
      setLinkModalOpen(false);
      return payload;
    }, "Intro video link saved");
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
              Details are set by admin — you can change your photo.
              </div>
            </div>
            <div className="ua-profile-modal__grid">
              <EditableField
                label="Full name"
                value={name}
                onChange={setName}
                disabled={savingDetails}
              />
              <PhoneField
                countryCode={phoneCountryCode}
                phone={phone}
                onCountryCode={setPhoneCountryCode}
                onPhone={setPhone}
                hint={profile.whatsappHint}
                disabled={savingDetails}
              />
              <ReadOnlyField label="Work email" value={profile.email} hint="Email is used to sign in and cannot be changed here." />
              <ReadOnlyField label="Role" value={`${profile.role} · ${profile.roleNote}`} />
            </div>
            <EditableField
              label="Address"
              value={address}
              onChange={setAddress}
              disabled={savingDetails}
              placeholder="Add your address"
            />

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
                onView={(item) => {
                  if (item.kind === "letter") {
                    onClose();
                    navigate(UPDATED_ADMIN_PATHS.commitmentLetters(account?.id || "me"));
                    return;
                  }
                  setPreview(item.kind);
                }}
                onUpload={(item) => {
                  if (item.kind === "letter") {
                    onClose();
                    navigate(UPDATED_ADMIN_PATHS.commitmentLetters(account?.id || "me"));
                    return;
                  }
                  videoRef.current?.click();
                }}
                onUseLink={() => setLinkModalOpen(true)}
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
            <button type="button" className="ua-profile-modal__library" onClick={openContentLibrary}>
              <span className="ua-profile-modal__library-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
              </span>
              <span className="ua-profile-modal__library-copy">
                <span className="ua-profile-modal__library-title">Coach content library</span>
                <span className="ua-profile-modal__library-sub">
                  Intro videos and commitment letters for every wellness coach and assistant.
                </span>
              </span>
              <span className="ua-profile-modal__library-open">Open</span>
            </button>
          )}

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
              <div className="ua-profile-modal__account-row">
                <span>Two-factor</span>
                <span className={profile.totpRequired ? "ua-profile-modal__2fa is-on" : "ua-profile-modal__2fa"}>
                  {profile.twoFactorStatus}
                </span>
              </div>
              {profile.isCoach ? (
                <div className="ua-profile-modal__account-row">
                  <span>Referral code</span>
                  <span>{profile.referralCode || "—"}</span>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="ua-profile-modal__password"
              onClick={() => setPasswordOpen(true)}
            >
              Change password
            </button>
          </section>
        </div>

        <div className="ua-profile-modal__foot">
          <p className="ua-profile-modal__foot-note">
            Email and role stay managed from Access. Save to update your name, mobile or address.
          </p>
          <div className="ua-profile-modal__foot-actions">
            <button
              type="button"
              className="ua-profile-modal__upload"
              disabled={savingDetails}
              onClick={saveDetails}
            >
              {savingDetails ? "Saving…" : "Save details"}
            </button>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-profile-modal__close-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      <PasswordChangeModal
        open={passwordOpen}
        busy={passwordBusy}
        onClose={() => setPasswordOpen(false)}
        onSubmit={savePassword}
      />
      <IntroLinkModal
        open={linkModalOpen}
        title="My intro video"
        initialUrl={content.video?.linkUrl || ""}
        busy={contentBusy}
        onClose={() => setLinkModalOpen(false)}
        onSave={handleIntroLinkSave}
      />
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
