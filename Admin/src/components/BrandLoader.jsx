import defaultLogo from "../assets/logo/defaultlogo.png";

export function BrandLoader({ label = "Loading Wellness Admin...", variant = "screen" }) {
  const isPage = variant === "page";

  return (
    <div
      className={["ua-brand-loader", isPage ? "ua-brand-loader--page" : "updated-admin"].join(" ")}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="ua-brand-loader__stage">
        <div className="ua-brand-loader__mark">
          <span className="ua-brand-loader__orbit" aria-hidden="true" />
          <span className="ua-brand-loader__glow" aria-hidden="true" />
          <img
            className="ua-brand-loader__logo"
            src={defaultLogo}
            alt="India Redefining Wellness"
            width={isPage ? 112 : 140}
            height={isPage ? 112 : 140}
          />
        </div>
        <p className="ua-brand-loader__label">{label}</p>
        <div className="ua-brand-loader__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
