import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { selectAppDisplayName, selectPanelLogoUrl } from "../../store/appConfigSelectors.js";
import { selectStaffAccount } from "../../store/staffAuthSelectors.js";
import { AdminMediaImage } from "../../admin/components/AdminMediaImage.jsx";
import { mediaUrl } from "../../media.js";
import { logout, logoutAssistant, logoutCoach, logoutStaff } from "../../store/authSlice.js";
import { confirmLogout } from "../utils/confirmLogout.js";
import { homePrefixForAccountType } from "../utils/navAccess.js";
import { NavIcon } from "../../admin/components/NavIcon.jsx";
import { TrackingRefreshButton } from "../../components/TrackingRefreshButton.jsx";
import defaultLogo from "../../assets/logo/defaultlogo.png";

const ACCOUNT_TYPE_LABELS = {
  admin: "Admin",
  wellness_coach: "Wellness Coach",
  assistant_wellness_coach: "Assistant Wellness Coach",
  staff: "Staff",
};

export function PanelHeader({
  title,
  onMenuClick,
  isDesktop,
  mobileNavOpen,
  desktopSidebarCollapsed,
  headerRefresh,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const staffAccount = useSelector(selectStaffAccount);
  const brandLogoUrl = useSelector(selectPanelLogoUrl);
  const appDisplayName = useSelector(selectAppDisplayName);
  const brandLogoSrc = mediaUrl(brandLogoUrl) || defaultLogo;
  const roleLabel = staffAccount?.isSuperAdmin
    ? "Super Admin"
    : ACCOUNT_TYPE_LABELS[staffAccount?.accountType] || "Staff";

  const [menuOpenState, setMenuOpenState] = useState(false);
  const wrapRef = useRef(null);

  const showCloseIcon = !isDesktop && mobileNavOpen;
  const navAriaExpanded = isDesktop ? !desktopSidebarCollapsed : mobileNavOpen;
  const navAriaLabel = isDesktop
    ? desktopSidebarCollapsed
      ? "Expand sidebar"
      : "Collapse sidebar"
    : mobileNavOpen
      ? "Close menu"
      : "Open menu";

  useEffect(() => {
    setMenuOpenState(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpenState) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setMenuOpenState(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpenState(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpenState]);

  const closeMenu = () => setMenuOpenState(false);

  const handleLogout = async () => {
    const ok = await confirmLogout();
    if (!ok) return;
    // Every login now funnels through `/panel/login` — clear every legacy
    // slot too so a stale Admin/Coach/Assistant token can't sneak a
    // "logged out" tab past that portal's own layout guard.
    dispatch(logoutStaff());
    dispatch(logout());
    dispatch(logoutCoach());
    dispatch(logoutAssistant());
    closeMenu();
    navigate("/panel/login", { replace: true });
  };

  return (
    <header className="admin-header">
      <button
        type="button"
        className="admin-header__menu-btn"
        onClick={onMenuClick}
        aria-label={navAriaLabel}
        aria-expanded={navAriaExpanded}
        aria-controls="panel-sidebar"
      >
        <NavIcon name={showCloseIcon ? "close" : "menu"} />
      </button>

      <div className="admin-header__brand">
        <img
          src={brandLogoSrc}
          alt=""
          className="admin-header__brand-logo"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = defaultLogo;
          }}
        />
        <div className="admin-header__title-group">
          <p className="admin-header__app-line">{appDisplayName || "Wellness"}</p>
          {title ? <p className="admin-header__page-line">{title}</p> : null}
        </div>
      </div>
      <div className="admin-header__spacer" />

      {headerRefresh?.onRefresh ? (
        <TrackingRefreshButton
          className="admin-header__refresh"
          onClick={headerRefresh.onRefresh}
          disabled={headerRefresh.refreshing}
          lastRefreshedAt={headerRefresh.lastRefreshedAt}
        />
      ) : null}

      <div className="admin-header__profile" ref={wrapRef}>
        <button
          type="button"
          className="admin-header__avatar-btn"
          aria-label="Account menu"
          aria-haspopup="true"
          aria-expanded={menuOpenState}
          onClick={() => setMenuOpenState((v) => !v)}
        >
          <AdminMediaImage
            path={staffAccount?.profileImage}
            round
            width={36}
            height={36}
            alt={staffAccount?.name || "Staff"}
            className="admin-header__avatar-img"
          />
        </button>

        {menuOpenState ? (
          <div className="admin-header__dropdown" role="menu">
            <div className="admin-header__dropdown-meta">
              <strong>{staffAccount?.name || "Staff"}</strong>
              <span>{roleLabel}</span>
            </div>
            <div className="admin-header__dropdown-sep" role="separator" />
            <Link
              to={`${homePrefixForAccountType(staffAccount?.accountType)}/profile`}
              className="admin-header__dropdown-item"
              role="menuitem"
              onClick={closeMenu}
            >
              <span className="admin-header__dropdown-icon" aria-hidden="true">
                <NavIcon name="profile" />
              </span>
              Profile
            </Link>
            <div className="admin-header__dropdown-sep" role="separator" />
            <button type="button" className="admin-header__dropdown-item" role="menuitem" onClick={handleLogout}>
              <span className="admin-header__dropdown-icon" aria-hidden="true">
                <NavIcon name="logout" />
              </span>
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
