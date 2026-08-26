const BARS = Array.from({ length: 12 }, (_, index) => index);

export function SiteLoader({ variant = "page", label = "Loading" }) {
  return (
    <div
      className={`site-loader site-loader--${variant}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="site-spinner" aria-hidden="true">
        {BARS.map((index) => (
          <span key={index} />
        ))}
      </div>
      <span className="site-loader__label">{label}</span>
    </div>
  );
}

export default SiteLoader;
