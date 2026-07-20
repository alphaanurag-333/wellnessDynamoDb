import { NotFoundPage } from "../../admin/pages/NotFoundPage.jsx";
import { SiteFooter } from "../components/SiteFooter.jsx";
import { SiteHeader } from "../components/SiteHeader.jsx";
import "../site.css";

/** Public-site 404 with website header/footer (not admin dashboard chrome). */
export function SiteNotFoundPage() {
  return (
    <div>
      <a href="#main-content" className="visually-hidden-focusable">
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main-content" className="site-main">
        <NotFoundPage />
      </main>
      <SiteFooter />
    </div>
  );
}
