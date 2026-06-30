import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { IoChevronDown, IoClose, IoMenu } from "react-icons/io5";
import defaultLogo from "../../assets/logo/defaultlogo.png";
import {
  selectAppDisplayName,
  selectLoginBrandLogoUrl,
} from "../../store/appConfigSelectors.js";
import { LOGIN_PORTAL_LINKS, SITE_NAV_LINKS } from "../data/siteNav.js";
import { useSiteConfig } from "../hooks/useSiteConfig.js";
import { SiteButton } from "./SiteButton.jsx";

function isNavActive(pathname, to) {
  if (to === "/") return pathname === "/";
  return pathname === to;
}

export function SiteHeader() {
  const location = useLocation();
  const brandLogoUrl = useSelector(selectLoginBrandLogoUrl);
  const appDisplayName = useSelector(selectAppDisplayName);
  const { mobileApp } = useSiteConfig();
  const logoSrc = brandLogoUrl || defaultLogo;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const loginRef = useRef(null);

  useEffect(() => {
    setMobileOpen(false);
    setLoginOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!loginOpen) return;
    const onDocClick = (e) => {
      if (loginRef.current && !loginRef.current.contains(e.target)) {
        setLoginOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setLoginOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [loginOpen]);

  const healthRoutes = [
    "/weight-management",
    "/gut-health",
    "/diabetes-care",
    "/thyroid-care",
  ];

  const isHealthActive = healthRoutes.includes(location.pathname);

  const handleNavClick = () => setMobileOpen(false);

  return (
    // <header >
    //   <div className="site-container">
    //     <div className="site-header__inner">
    //       <Link className="site-header__brand" to="/" aria-label={`${appDisplayName} home`}>
    //         <img className="site-header__logo" src={logoSrc} alt="" width={44} height={44} />
    //         <span className="site-header__name">{appDisplayName}</span>
    //       </Link>

    //       <nav className="site-header__nav" aria-label="Primary">
    //         {SITE_NAV_LINKS.map((item) => (
    //           <Link
    //             key={item.to}
    //             to={item.to}
    //             className={
    //               isNavActive(location.pathname, item.to)
    //                 ? "site-header__nav-link site-header__nav-link--active"
    //                 : "site-header__nav-link"
    //             }
    //           >
    //             {item.label}
    //           </Link>
    //         ))}
    //       </nav>

    //       <div className="site-header__actions">
    //         <SiteButton className="site-header__app-cta" to={mobileApp.primaryUrl}>
    //           {mobileApp.headerLabel}
    //         </SiteButton>
    //         <div className="site-header__login-wrap" ref={loginRef}>
    //           <button
    //             type="button"
    //             className="site-header__login-btn"
    //             aria-expanded={loginOpen}
    //             aria-haspopup="true"
    //             onClick={() => setLoginOpen((v) => !v)}
    //           >
    //             Login
    //             <IoChevronDown aria-hidden />
    //           </button>
    //           {loginOpen ? (
    //             <ul className="site-header__login-menu" role="menu">
    //               {LOGIN_PORTAL_LINKS.map((item) => (
    //                 <li key={item.to} role="none">
    //                   <Link to={item.to} role="menuitem" onClick={() => setLoginOpen(false)}>
    //                     {item.label}
    //                   </Link>
    //                 </li>
    //               ))}
    //             </ul>
    //           ) : null}
    //         </div>
    //       </div>

    //       <button
    //         type="button"
    //         className="site-header__menu-btn"
    //         aria-expanded={mobileOpen}
    //         aria-controls="site-mobile-nav"
    //         aria-label={mobileOpen ? "Close menu" : "Open menu"}
    //         onClick={() => setMobileOpen((v) => !v)}
    //       >
    //         {mobileOpen ? <IoClose size={22} /> : <IoMenu size={22} />}
    //       </button>
    //     </div>

    //     <div
    //       id="site-mobile-nav"
    //       className={mobileOpen ? "site-header__mobile-panel site-header__mobile-panel--open" : "site-header__mobile-panel"}
    //     >
    //       <ul className="site-header__mobile-nav">
    //         {SITE_NAV_LINKS.map((item) => (
    //           <li key={item.to}>
    //             <Link to={item.to} onClick={handleNavClick}>
    //               {item.label}
    //             </Link>
    //           </li>
    //         ))}
    //       </ul>
    //       <div className="site-header__mobile-app">
    //         <SiteButton to={mobileApp.primaryUrl} block onClick={handleNavClick}>
    //           {mobileApp.headerLabel}
    //         </SiteButton>
    //       </div>
    //       <details className="site-header__mobile-login">
    //         <summary>Login</summary>
    //         <ul>
    //           {LOGIN_PORTAL_LINKS.map((item) => (
    //             <li key={item.to}>
    //               <Link to={item.to} onClick={handleNavClick}>
    //                 {item.label}
    //               </Link>
    //             </li>
    //           ))}
    //         </ul>
    //       </details>
    //     </div>
    //   </div>
    // </header>

    // <header className={`site-header${scrolled ? " site-header--scrolled" : ""}`}>
    //   <div className="container">
    //     <div className="site-header__inner">

    //       {/* Logo */}
    //       <Link to="/" className="site-header__brand">
    //         <img src={logoSrc} alt="Logo" />
    //       </Link>

    //       {/* Navigation */}
    //       <nav className="site-header__nav">

    //         <Link to="/">Home</Link>

    //         <Link to="/about-us">About Us</Link>

    //         <div className="dropdown nav-dropdown">
    //           <Link
    //             to="#"
    //             className="dropdown-toggle"
    //             data-bs-toggle="dropdown"
    //           >
    //             Health Solutions
    //           </Link>

    //           <ul className="dropdown-menu">
    //             <li>
    //               <Link className="dropdown-item" to="/weight-management">
    //                 Weight Management
    //               </Link>
    //             </li>

    //             <li>
    //               <Link className="dropdown-item" to="/diabetes-care">
    //                 Diabetes Care
    //               </Link>
    //             </li>

    //             <li>
    //               <Link className="dropdown-item" to="/heart-health">
    //                 Heart Health
    //               </Link>
    //             </li>
    //           </ul>
    //         </div>

    //         <Link to="/success-stories">Success Stories</Link>

    //         <Link to="/resources">Resources</Link>

    //         <Link to="/contact">Contact Us</Link>

    //       </nav>

    //       {/* CTA */}
    //       <div className="site-header__actions">
    //         <Link
    //           to="/consultation"
    //           className="consultation-btn"
    //         >
    //           BOOK A FREE CONSULTATION
    //         </Link>
    //       </div>

    //     </div>
    //   </div>
    // </header>

    <>
      <header
        className={`site-header${scrolled ? " site-header--scrolled" : ""}`}
      >
        <div className="site-container">
          <div className="site-header__inner">
            {/* Logo */}
            <Link
              className="site-header__brand"
              to="/"
              aria-label={`${appDisplayName} home`}
            >
              <img
                className="site-header__logo"
                src={logoSrc}
                alt=""
                width={44}
                height={44}
              />
              <span className="site-header__name">{appDisplayName}</span>
            </Link>

            {/* Navigation */}
            <nav className="site-header__nav">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `site-header__link ${isActive ? "active" : ""}`
                }
              >
                Home
              </NavLink>

              <NavLink
                to="/about-us"
                className={({ isActive }) =>
                  `site-header__link ${isActive ? "active" : ""}`
                }
              >
                About Us
              </NavLink>

              <div className="site-header__dropdown">
                <button
                  type="button"
                  className={`site-header__link site-header__dropdown-btn ${
                    isHealthActive ? "active" : ""
                  }`}
                >
                  Health Solutions
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 9L12 15L18 9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>

                <div className="site-header__dropdown-menu">
                  <NavLink
                    to="/weight-management"
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    Weight Management
                  </NavLink>

                  <NavLink
                    to="/gut-health"
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    Gut Health
                  </NavLink>

                  <NavLink
                    to="/diabetes-care"
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    Diabetes Care
                  </NavLink>

                  <NavLink
                    to="/thyroid-care"
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    Thyroid Care
                  </NavLink>
                </div>
              </div>

              <NavLink
                to="/success-stories"
                className={({ isActive }) =>
                  `site-header__link ${isActive ? "active" : ""}`
                }
              >
                Success Stories
              </NavLink>

              <NavLink
                to="/resources"
                className={({ isActive }) =>
                  `site-header__link ${isActive ? "active" : ""}`
                }
              >
                Resources
              </NavLink>

              <NavLink
                to="/contact-us"
                className={({ isActive }) =>
                  `site-header__link ${isActive ? "active" : ""}`
                }
              >
                Contact Us
              </NavLink>
            </nav>

            {/* CTA */}
            <Link to="/consultation" className="site-header__cta">
              Book a free consultation
            </Link>

            {/* Mobile Button */}
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>

      <div
        className={`mobile-overlay ${
          mobileMenuOpen ? "mobile-overlay--show" : ""
        }`}
        onClick={() => setMobileMenuOpen(false)}
      ></div>

      <div
        className={`mobile-overlay ${
          mobileMenuOpen ? "mobile-overlay--show" : ""
        }`}
        onClick={() => setMobileMenuOpen(false)}
      ></div>

      <div
        className={`mobile-sidebar ${
          mobileMenuOpen ? "mobile-sidebar--open" : ""
        }`}
      >
        <div className="mobile-sidebar__header">
          <img src="/images/logo.png" alt="" />

          <button onClick={() => setMobileMenuOpen(false)}>✕</button>
        </div>

        <nav className="mobile-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={() => setMobileMenuOpen(false)}
          >
            Home
          </NavLink>

          <NavLink
            to="/about-us"
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={() => setMobileMenuOpen(false)}
          >
            About Us
          </NavLink>

          <details open={isHealthActive}>
            <summary className={isHealthActive ? "active" : ""}>
              Health Solutions
            </summary>

            <div className="mobile-submenu">
              <NavLink
                to="/weight-management"
                className={({ isActive }) => (isActive ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Weight Management
              </NavLink>

              <NavLink
                to="/gut-health"
                className={({ isActive }) => (isActive ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Gut Health
              </NavLink>

              <NavLink
                to="/diabetes-care"
                className={({ isActive }) => (isActive ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Diabetes Care
              </NavLink>

              <NavLink
                to="/thyroid-care"
                className={({ isActive }) => (isActive ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Thyroid Care
              </NavLink>
            </div>
          </details>

          <NavLink
            to="/success-stories"
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={() => setMobileMenuOpen(false)}
          >
            Success Stories
          </NavLink>

          <NavLink
            to="/resources"
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={() => setMobileMenuOpen(false)}
          >
            Resources
          </NavLink>

          <NavLink
            to="/contact-us"
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={() => setMobileMenuOpen(false)}
          >
            Contact Us
          </NavLink>
        </nav>

        <Link
          to="/consultation"
          className="mobile-cta"
          onClick={() => setMobileMenuOpen(false)}
        >
          Book a free consultation
        </Link>
      </div>
    </>
  );
}
