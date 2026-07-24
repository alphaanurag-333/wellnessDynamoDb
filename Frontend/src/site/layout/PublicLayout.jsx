import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { PATH_TO_SECTION_ID } from "../data/siteSections.js";
import { SiteFooter } from "../components/SiteFooter.jsx";
import { SiteHeader } from "../components/SiteHeader.jsx";
import "../site.css";
import ScrollToTopButton from "../components/ScrollToTopButton.jsx";

function scrollToSection(sectionId) {
  if (!sectionId) return;
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function PublicLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    const sectionId = PATH_TO_SECTION_ID[pathname];
    if (sectionId) {
      const timer = window.setTimeout(() => scrollToSection(sectionId), 50);
      return () => window.clearTimeout(timer);
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <div className="">
      <a href="#main-content" className="visually-hidden-focusable">
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main-content" className="site-main">
        <Outlet />
      </main>
      <SiteFooter />
      <ScrollToTopButton/>
    </div>
  );
}
