import { useEffect, useState } from "react";
import FinalCTA from "../components/FinalCTA.jsx";
import { fetchStaticPageBySlug } from "../api/publicMisc.js";

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

  return (
    <section className="static-page-section">
      <div className="static-page-hero">
        <div className="site-container static-page-hero__inner">
          <span className="static-page-tag">INFORMATION</span>
          <h1 className="static-page-title">{loading ? "Loading…" : title}</h1>
        </div>
      </div>

      <div className="site-container static-page-body">
        {loading && <p className="static-page-message">Loading content…</p>}

        {error && !loading && (
          <p className="static-page-message static-page-message--error" role="alert">
            {error}
          </p>
        )}

        {page?.content && !loading && !error && (
          <div
            className="static-page-content"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        )}
      </div>

      <FinalCTA />
    </section>
  );
}
