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
    "/fat-loss",
    "/diabetes-reversal",
    "/pcod-pcos-reversal",
    "/gut-health",
    "/thyroid",
  ];

  const isHealthActive = healthRoutes.includes(location.pathname);

  const handleNavClick = () => setMobileOpen(false);

  return (
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
                    to="/fat-loss"
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                   Fat Loss
                  </NavLink>

                  <NavLink
                    to="/diabetes-reversal"
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    Diabetes Reversal
                  </NavLink>

                  <NavLink
                    to="/pcod-pcos-reversal"
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    PCOD / PCOS Reversal
                  </NavLink>

                  <NavLink
                    to="/thyroid"
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    Thyroid Care
                  </NavLink>

                  <NavLink
                    to="/gut-health"
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    Gut Health
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
                to="/wellnesspedia"
                className={({ isActive }) =>
                  `site-header__link ${isActive ? "active" : ""}`
                }
              >
                Wellnesspedia
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
            <Link
              to="#"
              className="site-header__cta"
              onClick={(e) => {
                e.preventDefault();
                window.open(
                  "https://wa.me/919372109740",
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              Book a consultation
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
                to="/fat-loss"
                className={({ isActive }) => (isActive ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Fat Loss
              </NavLink>

              <NavLink
                to="/diabetes-reversal"
                className={({ isActive }) => (isActive ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Diabetes Reversal
              </NavLink>

              <NavLink
                to="/pcod-pcos-reversal"
                className={({ isActive }) => (isActive ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                PCOD / PCOS reversal
              </NavLink>

              <NavLink
                to="/thyroid"
                className={({ isActive }) => (isActive ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Thyroid Care
              </NavLink>

              <NavLink
                to="/gut-health"
                className={({ isActive }) => (isActive ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Gut Health
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
            to="/wellnesspedia"
            className={({ isActive }) => (isActive ? "active" : "")}
            onClick={() => setMobileMenuOpen(false)}
          >
            Wellnesspedia
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
          to="#"
          className="mobile-cta"
          onClick={(e) => {
            e.preventDefault();
            setMobileMenuOpen(false);
            window.open(
              "https://wa.me/919372109740",
              "_blank",
              "noopener,noreferrer",
            );
          }}
        >
          Book a consultation
        </Link>
      </div>
    </>
  );
}
