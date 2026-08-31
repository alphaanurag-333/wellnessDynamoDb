import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateUserProfileImage } from "../../api/usersApi.js";
import { UPDATED_ADMIN_PATHS } from "../../data/dashboardData.js";
import { NotificationInboxPanel } from "../NotificationInboxPanel.jsx";
import { useViewAs } from "../../context/ViewAsContext.jsx";

const PROFILE_IMAGE_MAX_BYTES = 25 * 1024 * 1024;
const PROFILE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function clientInitials(name) {
  const parts = String(name || "Client").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function ClientAvatar({
  user,
  className = "",
  editable = false,
  uploading = false,
  onPickPhoto,
}) {
  const src = user?.profileImage;
  const name = user?.name || "Client";
  const hasPhoto = Boolean(src);
  const actionLabel = uploading
    ? "Uploading profile photo"
    : hasPhoto
      ? "Replace profile photo"
      : "Upload profile photo";

  const media = src ? (
    <img src={src} alt={name} className="ua-cp-sidebar__avatar-img" />
  ) : (
    <span className="ua-cp-sidebar__avatar-ph" aria-hidden="true">
      {clientInitials(name)}
    </span>
  );

  const editBadge = editable ? (
    <span className="ua-cp-sidebar__avatar-edit" aria-hidden="true">
      {uploading ? (
        <span className="ua-cp-sidebar__avatar-spinner" />
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      )}
    </span>
  ) : null;

  if (editable) {
    return (
      <button
        type="button"
        className={`ua-cp-sidebar__avatar ua-cp-sidebar__avatar--editable${src ? "" : " ua-cp-sidebar__avatar--initials"}${uploading ? " is-uploading" : ""} ${className}`.trim()}
        onClick={onPickPhoto}
        disabled={uploading}
        aria-label={actionLabel}
        title={uploading ? "Uploading…" : hasPhoto ? "Replace photo" : "Upload photo"}
      >
        <span className="ua-cp-sidebar__avatar-media">{media}</span>
        {editBadge}
      </button>
    );
  }

  return (
    <div className={`ua-cp-sidebar__avatar${src ? "" : " ua-cp-sidebar__avatar--initials"} ${className}`.trim()}>
      <span className="ua-cp-sidebar__avatar-media">{media}</span>
    </div>
  );
}

export function ClientProfileTopbar({
  menuHidden,
  onToggleMenu,
  onSave,
  onRefresh,
  refreshing = false,
  readOnly = false,
  backTo,
}) {
  const navigate = useNavigate();
  const { can } = useViewAs();
  const canEditPii = !readOnly && can("console.pii.edit");
  const usersPath = backTo || UPDATED_ADMIN_PATHS.users;

  return (
    <header className="ua-cp-topbar">
      <button
        type="button"
        className="ua-cp-topbar__btn"
        onClick={() => navigate(usersPath, { replace: true })}
      >
        ← Users
      </button>
      <button type="button" className="ua-cp-topbar__btn ua-cp-topbar__btn--menu" onClick={onToggleMenu} title="Toggle menu">
        {menuHidden ? "▥ Show menu" : "▤ Hide menu"}
      </button>
      <div className="ua-cp-topbar__title">Client profile</div>
      <div className="ua-cp-topbar__actions">
          <button
            type="button"
            className={`ua-cp-topbar__icon ua-cp-topbar__icon--refresh${refreshing ? " is-spinning" : ""}`}
            aria-label={refreshing ? "Refreshing profile" : "Refresh profile"}
            title={refreshing ? "Refreshing…" : "Refresh"}
            disabled={refreshing || !onRefresh}
            onClick={onRefresh}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
          {canEditPii ? (
            <button type="button" className="ua-cp-topbar__icon ua-cp-topbar__icon--save" title="Save profile" onClick={onSave} aria-label="Save">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <path d="M17 21v-8H7v8" />
                <path d="M7 3v5h8" />
              </svg>
            </button>
          ) : null}
          <NotificationInboxPanel
            wrapClassName="ua-cp-topbar__bell-wrap"
            btnClassName="ua-cp-topbar__icon ua-cp-topbar__icon--bell"
          />
      </div>
    </header>
  );
}

export function ClientProfileSidebar({
  user,
  menu = [],
  activeSection,
  onSectionChange,
  hidden,
  showAllTags,
  onToggleTags,
  compact = false,
  onUserUpdated,
  onToast,
  readOnly = false,
}) {
  const { can } = useViewAs();
  const canEditPii = !readOnly && can("console.pii.edit");
  const tags = Array.isArray(user?.tags) ? user.tags : [];
  const visibleTags = showAllTags ? tags : tags.slice(0, 2);
  const extraTags = tags.length - 2;
  const programLabel = user?.programLabel || "—";
  const programs = user?.programs ?? 0;
  const userId = String(user?.id || user?._id || "").trim();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const sidebarRef = useRef(null);
  const fileRef = useRef(null);

  const avatarProps = {
    user,
    editable: canEditPii,
    uploading: uploadingPhoto,
    onPickPhoto: () => {
      if (!canEditPii || uploadingPhoto) return;
      fileRef.current?.click();
    },
  };

  useEffect(() => {
    if (!mobileOpen) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  function closeMobileSidebar() {
    setMobileOpen(false);
  }

  function handleSectionChange(id) {
    onSectionChange(id);
    closeMobileSidebar();
  }

  async function handlePhotoSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !userId || !canEditPii || uploadingPhoto) return;
    if (!PROFILE_IMAGE_TYPES.has(file.type)) {
      onToast?.("Use JPEG, PNG, GIF, or WebP");
      return;
    }
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      onToast?.("Profile image must be 25 MB or smaller");
      return;
    }
    setUploadingPhoto(true);
    try {
      const updated = await updateUserProfileImage(userId, file);
      onUserUpdated?.(updated);
      onToast?.(user?.profileImage ? "Profile photo updated" : "Profile photo uploaded");
    } catch (error) {
      onToast?.(error?.message || "Could not upload profile photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <aside
      ref={sidebarRef}
      className={`ua-cp-sidebar${hidden ? " ua-cp-sidebar--hidden" : ""}${mobileOpen ? " ua-cp-sidebar--mobile-open" : ""}`}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        hidden
        onChange={handlePhotoSelected}
      />
      <div className="ua-cp-sidebar__mobile-card">
        <ClientAvatar {...avatarProps} />
        <div className="ua-cp-sidebar__mobile-meta">
          <div className="ua-cp-sidebar__mobile-name" title={user?.name || "Client"}>
            {user?.name || "Client"}
          </div>
          <div className="ua-cp-sidebar__mobile-sub">{programLabel} · {programs} programs</div>
        </div>
        <button
          type="button"
          className="ua-cp-sidebar__view-btn"
          aria-expanded={mobileOpen}
          aria-controls="ua-cp-sidebar-panel"
          aria-label={`View ${user?.name || "client"} menu`}
          onClick={() => setMobileOpen(true)}
        >
          View
        </button>
      </div>

      <button
        type="button"
        className="ua-cp-sidebar__backdrop"
        tabIndex={-1}
        aria-hidden="true"
        onClick={closeMobileSidebar}
      />

      <div id="ua-cp-sidebar-panel" className="ua-cp-sidebar__panel">
        <div className="ua-cp-sidebar__panel-head">
          <span className="ua-cp-sidebar__panel-title">Client menu</span>
          <button
            type="button"
            className="ua-cp-sidebar__close"
            onClick={closeMobileSidebar}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <div className="ua-cp-sidebar__profile">
          <div className="ua-cp-sidebar__profile-row">
            <ClientAvatar {...avatarProps} className="ua-cp-sidebar__avatar--desktop" />
            <div className="ua-cp-sidebar__info">
              <div className="ua-cp-sidebar__name" title={user?.name || "Client"}>
                {user?.name || "Client"}
              </div>
              <div className="ua-cp-sidebar__sub">
                {programLabel} · {programs} {programs === 1 ? "program" : "programs"}
              </div>
            </div>
          </div>
          <div className="ua-cp-sidebar__tags">
            {visibleTags.map((tag, i) => (
              <span key={`${tag}-${i}`} className={`ua-cp-tag ua-cp-tag--${i % 3}`}>{tag}</span>
            ))}
            {!showAllTags && extraTags > 0 ? (
              <button type="button" className="ua-cp-tag ua-cp-tag--more" onClick={onToggleTags}>+{extraTags} more</button>
            ) : null}
          </div>
        </div>

        {compact ? null : (
          <div className="ua-cp-sidebar__sub-box">
            <strong>{user?.subscriptionDays ?? 0}</strong>
            <span>days left<br />on app subscription</span>
          </div>
        )}

        <div className="ua-cp-sidebar__menu-label">Menu list</div>
        <nav className="ua-cp-sidebar__nav">
          {menu.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ua-cp-sidebar__link${activeSection === item.id ? " ua-cp-sidebar__link--active" : ""}${item.accent ? " ua-cp-sidebar__link--accent" : ""}`}
              onClick={() => handleSectionChange(item.id)}
            >
              <span>{item.label}</span>
              <span className="ua-cp-sidebar__caret">›</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
