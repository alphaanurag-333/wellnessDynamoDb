import { useEffect, useState } from "react";
import FinalCTA from "../components/FinalCTA.jsx";
import { SiteLoader } from "../components/SiteLoader.jsx";
import { fetchStaticPageBySlug, htmlFromStaticPage } from "../api/publicMisc.js";

export function StaticPageView({ slug, fallbackTitle = "Page" }) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setPage(null);

    fetchStaticPageBySlug(slug)
      .then((data) => {
        if (!cancelled) setPage(data?.page || null);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Page not found");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const title = page?.title || fallbackTitle;
  const html = htmlFromStaticPage(page);

  if (loading) {
    return <SiteLoader variant="page" label="Loading content" />;
  }

  return (
    <section className="static-page-section">
      <div className="site-container">
      <div className="static-page-hero">
        <div className="site-container static-page-hero__inner paddingmanages">
          {/* <span className="static-page-tag">INFORMATION</span> */}
          <h1 className="static-page-title">{title}</h1>
        </div>
      </div>

      <div className="site-container static-page-body">
        {error && (
          <p className="static-page-message static-page-message--error" role="alert">
            {error}
          </p>
        )}

        {html && !error && (
          <div
            className="static-page-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
        {!html && !error && (
          <p className="static-page-message">This page has no published content yet.</p>
        )}
      </div>
      </div>
      <FinalCTA />
     
    </section>
  );
}
