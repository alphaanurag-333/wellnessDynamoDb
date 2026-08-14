import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { accountUpdateMe } from "../api/accountApi.js";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { buildProfileFromAccount } from "../data/profileData.js";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";

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

export function ProfileModal({ open, onClose, onToast }) {
  const navigate = useNavigate();
  const { account, activeRole, setAccount } = useViewAs();
  const profile = useMemo(
    () => buildProfileFromAccount(account, activeRole),
    [account, activeRole],
  );
  const [bio, setBio] = useState(profile.bio);
  const [savingBio, setSavingBio] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const bioBaseline = useRef(profile.bio);

  useEffect(() => {
    if (!open) return;
    setBio(profile.bio);
    bioBaseline.current = profile.bio;
  }, [open, profile.bio, profile.id]);

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
                <div className="ua-profile-modal__photo-sub">Shown to clients beside your messages</div>
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
            <div className="ua-profile-modal__card-head">
              <div className="ua-profile-modal__card-title">About you</div>
              <div className="ua-profile-modal__card-hint">A short bio clients see on your profile.</div>
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
              <div className="ua-profile-modal__account-row">
                <span>Two-factor</span>
                <span>{profile.twoFactor}</span>
              </div>
            </div>
            <button
              type="button"
              className="ua-profile-modal__password"
              onClick={() => onToast?.("Change password — ask an admin or use the password reset flow.")}
            >
              Change password
            </button>
          </section>
        </div>

        <div className="ua-profile-modal__foot">
          <span className="ua-profile-modal__foot-note">
            Ask an admin to change your name, contact or address.
          </span>
          <button type="button" className="ua-team-modal__close-btn ua-profile-modal__close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
