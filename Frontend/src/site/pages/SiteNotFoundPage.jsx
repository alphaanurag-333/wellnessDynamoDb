import { Link } from "react-router-dom";
import { SiteFooter } from "../components/SiteFooter.jsx";
import { SiteHeader } from "../components/SiteHeader.jsx";
import "../site.css";

export function SiteNotFoundPage() {
  return (
    <div>
      <a href="#main-content" className="visually-hidden-focusable">
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main-content" className="site-main">
        <section className="static-page-section site-not-found">
          <div className="static-page-hero">
            <div className="site-container static-page-hero__inner paddingmanages">
              <h1 className="static-page-title">Page not found</h1>
            </div>
          </div>
          <div className="site-container static-page-body">
            <p className="static-page-message">
              That page does not exist, or it may have been moved. Check the address or return to the home page.
            </p>
            <Link to="/" className="site-header__cta">
              Back to home
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
