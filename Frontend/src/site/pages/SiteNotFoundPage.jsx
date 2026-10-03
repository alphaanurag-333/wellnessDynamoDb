import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { AppDownloadModalProvider } from "../components/AppDownloadModalContext.jsx";
import { SiteButton } from "../components/SiteButton.jsx";
import { SiteFooter } from "../components/SiteFooter.jsx";
import { SiteHeader } from "../components/SiteHeader.jsx";
import "../site.css";

const HELP_LINKS = [
  { label: "About Us", to: "/about-us" },
  { label: "Success Stories", to: "/success-stories" },
  { label: "Wellnesspedia", to: "/wellnesspedia" },
  { label: "Fat Loss", to: "/fat-loss" },
  { label: "Diabetes Reversal", to: "/diabetes-reversal" },
];

export function SiteNotFoundPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Page not found | India Redefining Wellness";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <AppDownloadModalProvider>
      <div className="site-shell">
        <a href="#main-content" className="visually-hidden-focusable">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main-content" className="site-main">
          <section className="site-not-found" aria-labelledby="site-not-found-title">
            <div className="site-not-found__card">
              <div className="site-not-found__badge" aria-hidden="true">
                <Compass size={28} strokeWidth={1.75} />
              </div>
              <p className="site-not-found__code">404</p>
              <h1 id="site-not-found-title" className="site-not-found__title">
                Page not found
              </h1>
              <p className="site-not-found__message">
                That page does not exist, or it may have been moved. Check the address, or
                continue from one of the pages below.
              </p>
              <div className="site-not-found__actions">
                <SiteButton to="/">Back to home</SiteButton>
                <SiteButton to="/contact-us" variant="secondary">
                  Contact us
                </SiteButton>
              </div>
              <nav className="site-not-found__links" aria-label="Popular pages">
                <p className="site-not-found__links-label">Popular pages</p>
                <ul>
                  {HELP_LINKS.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </AppDownloadModalProvider>
  );
}
