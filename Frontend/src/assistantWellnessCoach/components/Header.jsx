import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { NavIcon } from "../../admin/components/NavIcon.jsx";
import { AdminMediaImage } from "../../admin/components/AdminMediaImage.jsx";
import { selectAppDisplayName, selectPanelLogoUrl } from "../../store/appConfigSelectors.js";
import { mediaUrl } from "../../media.js";
import { logoutAssistant } from "../../store/authSlice.js";
import { TrackingRefreshButton } from "../../components/TrackingRefreshButton.jsx";
import defaultLogo from "../../assets/logo/defaultlogo.png";
import { confirmAssistantLogout } from "../utils/confirmLogout.js";

export function AssistantHeader({
  onMenuClick,
  isDesktop,
  mobileNavOpen,
  desktopSidebarCollapsed,
  headerRefresh,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const assistant = useSelector((s) => s.auth.assistant);
  const brandLogoUrl = useSelector(selectPanelLogoUrl);
  const appDisplayName = useSelector(selectAppDisplayName);
  const brandLogoSrc = mediaUrl(brandLogoUrl) || defaultLogo;

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
    const ok = await confirmAssistantLogout();
    if (!ok) return;
    dispatch(logoutAssistant());
    closeMenu();
    navigate("/assistant/login", { replace: true });
  };

  return (
    <header className="admin-header">
      <button
        type="button"
        className="admin-header__menu-btn"
        onClick={onMenuClick}
        aria-label={navAriaLabel}
        aria-expanded={navAriaExpanded}
        aria-controls="assistant-sidebar"
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
        </div>
      </div>
      <div className="admin-header__spacer" />

      {headerRefresh?.onRefresh ? (
        <TrackingRefreshButton
          className="admin-header__refresh"
          onClick={headerRefresh.onRefresh}
          disabled={headerRefresh.refreshing}
        />
      ) : null}

      <div className="admin-header__profile" ref={wrapRef}>
        <button
          type="button"
          className="admin-header__avatar-btn"
          aria-label="Assistant menu"
          aria-haspopup="true"
          aria-expanded={menuOpenState}
          onClick={() => setMenuOpenState((v) => !v)}
        >
          <AdminMediaImage
            path={assistant?.profileImage}
            round
            width={36}
            height={36}
            alt={assistant?.name || "Assistant"}
            className="admin-header__avatar-img"
          />
        </button>

        {menuOpenState ? (
          <div className="admin-header__dropdown" role="menu">
            <Link to="/assistant/profile" className="admin-header__dropdown-item" role="menuitem" onClick={closeMenu}>
              <span className="admin-header__dropdown-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              Profile
            </Link>
            <div className="admin-header__dropdown-sep" role="separator" />
            <button type="button" className="admin-header__dropdown-item" role="menuitem" onClick={handleLogout}>
              <span className="admin-header__dropdown-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
              </span>
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
