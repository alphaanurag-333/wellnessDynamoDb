import { DEFAULT_IMAGE_SRC, handleMediaImageError } from "./AdminMediaImage.jsx";

const PROFILE_TABS = [
  { id: "personal", label: "Personal Details" },
  { id: "password", label: "Change Password" },
];

export function ProfilePageLayout({
  pageTitle,
  userName,
  userEmail,
  avatarSrc,
  avatarCacheKey,
  photoLoading,
  fileInputRef,
  onAvatarFile,
  tab,
  onTabChange,
  onSave,
  saving,
  personalFields,
  passwordFields,
}) {
  return (
    <div className="admin-profile-page">
      <div className="admin-profile-page__head">
        <h2 className="admin-profile-page__title">{pageTitle}</h2>
        <button type="button" className="btn btn--save-profile" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <div className="admin-profile-card">
        <div className="admin-profile-card__identity">
          <div className={`admin-profile-avatar-wrap${photoLoading ? " admin-profile-avatar-wrap--busy" : ""}`}>
            <input
              ref={fileInputRef}
              type="file"
              className="admin-profile-avatar-file"
              accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
              aria-hidden="true"
              tabIndex={-1}
              onChange={onAvatarFile}
            />
            <img
              key={avatarCacheKey}
              src={
                avatarSrc
                  ? `${avatarSrc}${avatarSrc.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(avatarCacheKey))}`
                  : DEFAULT_IMAGE_SRC
              }
              alt=""
              className="admin-profile-avatar"
              width={88}
              height={88}
              onError={handleMediaImageError}
            />
            <button
              type="button"
              className="admin-profile-avatar-cam"
              aria-label="Change profile photo"
              title="Upload photo"
              disabled={photoLoading}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
            {photoLoading ? <span className="admin-profile-avatar-spinner" aria-live="polite" /> : null}
          </div>
          <div>
            <div className="admin-profile-card__name">{userName || "—"}</div>
            <div className="admin-profile-card__email">{userEmail || "—"}</div>
          </div>
        </div>

        <div className="admin-profile-tabs" role="tablist">
          {PROFILE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`admin-profile-tabs__btn${tab === t.id ? " admin-profile-tabs__btn--active" : ""}`}
              onClick={() => onTabChange(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "personal" ? (
          <div className="admin-profile-panel">
            <div className="user-form__grid user-form__grid--profile">{personalFields}</div>
          </div>
        ) : null}

        {tab === "password" ? (
          <div className="admin-profile-panel">
            <div className="profile-password-form">
              <p className="profile-password-form__intro">
                Update your password regularly. Use at least 8 characters and avoid reusing passwords from other sites.
              </p>
              {passwordFields}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ProfileField({ label, required, children, fullWidth = false }) {
  return (
    <label className={`user-field${fullWidth ? " user-field--full user-field--profile-wide" : ""}`}>
      <span className="user-field__label">
        {label}
        {required ? <span className="required-dot"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

export function ProfilePasswordField({ label, value, onChange, visible, onToggleVisible, autoComplete, hint }) {
  return (
    <label className="user-field user-field--password">
      <span className="user-field__label">
        {label}
        <span className="required-dot"> *</span>
      </span>
      <div className="profile-password-wrap">
        <input
          className="profile-password-wrap__input"
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="profile-password-wrap__toggle"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={onToggleVisible}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            {visible ? (
              <>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </>
            ) : (
              <>
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      </div>
      {hint ? <span className="user-field__hint">{hint}</span> : null}
    </label>
  );
}

export function PortalDashboardIntro({ title, subtitle }) {
  return (
    <div className="page-stack">
      <section className="dashboard-intro" aria-label="Dashboard heading">
        <h1 className="dashboard-intro__title">{title}</h1>
        <p className="dashboard-intro__subtitle">{subtitle}</p>
      </section>
    </div>
  );
}
