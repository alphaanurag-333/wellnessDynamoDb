import loaderLogo from "../../assets/logo/irw-loader.png";

const LOADER_ALT = "India Redefining Wellness";

/**
 * Consistent IRW brand loader for boot, route Suspense, and section fetches.
 * Variants: overlay (full viewport), page (main content), inline (sections).
 */
export function SiteLoader({
  variant = "page",
  label = "Loading…",
  logoSrc = loaderLogo,
}) {
  const isInline = variant === "inline";
  const logoSize = isInline ? 72 : variant === "page" ? 112 : 140;

  return (
    <div
      className={`site-loader site-loader--${variant}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="site-loader__stage">
        <div className="site-loader__mark">
          <span className="site-loader__orbit" aria-hidden="true" />
          <span className="site-loader__glow" aria-hidden="true" />
          <img
            className="site-loader__logo"
            src={logoSrc}
            alt={LOADER_ALT}
            width={logoSize}
            height={logoSize}
            decoding="async"
          />
        </div>
        <p className="site-loader__caption">{label}</p>
        <div className="site-loader__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
      <span className="site-loader__label">{label}</span>
    </div>
  );
}

export default SiteLoader;
