import { useLocation, useNavigate } from "react-router-dom";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { userInitials } from "../data/usersData.js";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { useAppSelector } from "../store/hooks.js";
import { selectAdminProfile } from "../store/slices/adminProfileSlice.js";
import { HeaderSearch } from "./HeaderSearch.jsx";
import { NotificationInboxPanel } from "./NotificationInboxPanel.jsx";

export function AdminHeader({
  onOpenProfile,
  onOpenMobileNav,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDashboard = pathname === UPDATED_ADMIN_PATHS.dashboard || pathname === "/";
  const isUsersList = pathname === UPDATED_ADMIN_PATHS.users;
  const isUserDetail = /^\/users\/[^/]+$/.test(pathname);
  const { activeRole, account } = useViewAs();
  const storedProfile = useAppSelector(selectAdminProfile);
  const profileAccount = storedProfile || account;
  const avatarInitial = userInitials(profileAccount?.name || activeRole.name).charAt(0) || "A";
  const profileImage = profileAccount?.profileImage || null;

  function handleBack() {
    // Client profile ↔ users list used to bounce via history. Use stable parents instead.
    if (isUserDetail) {
      navigate(UPDATED_ADMIN_PATHS.users, { replace: true });
      return;
    }
    if (isUsersList) {
      navigate(UPDATED_ADMIN_PATHS.dashboard);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(UPDATED_ADMIN_PATHS.dashboard);
  }

  return (
    <header className="header">
      <button
        type="button"
        className="header__menu"
        aria-label="Open menu"
        onClick={onOpenMobileNav}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {isDashboard ? null : (
        <button
          type="button"
          className="header__back"
          title="Go back"
          onClick={handleBack}
        >
          ‹ <span className="header__back-label">Back</span>
        </button>
      )}

      <HeaderSearch />

      <div className="header__actions">
        <NotificationInboxPanel />

        <div className="header__profile">
          <span
            className="header__profile-badge"
            style={{
              color: activeRole.color,
              background: activeRole.bg,
              borderColor: `${activeRole.color}33`,
            }}
          >
            {activeRole.name}
          </span>
          <button type="button" className="header__avatar" aria-label="My profile" onClick={onOpenProfile}>
            {profileImage ? (
              <img className="header__avatar-img" src={profileImage} alt="" />
            ) : (
              avatarInitial
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
