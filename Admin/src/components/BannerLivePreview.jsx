import "./bannerConfig.css";

function BannerImage({ src, className }) {
  if (!src) return null;
  return <img className={className} src={src} alt="" />;
}

export function BannerLivePreview({
  webOn = true,
  appOn = true,
  webImage = "",
  mobileImage = "",
}) {
  return (
    <div className="ua-cfg-bn-preview ua-cfg-bn-live-preview">
      {webOn ? (
        <div className="ua-cfg-bn-live-preview__pane ua-cfg-bn-preview__web">
          <span className="ua-cfg-bn-preview__label is-web">Website</span>
          <div className="ua-cfg-bn-live-preview__browser">
            <div className="ua-cfg-bn-live-preview__chrome">
              <span className="ua-cfg-pt-live-preview__brand">IR</span>
              <strong>India Redefining Wellness</strong>
              <span className="ua-cfg-bn-live-preview__chrome-url">irwellness.in</span>
              <span className="ua-cfg-bn-live-preview__chrome-actions" aria-hidden="true">
                <span />
                <span />
                <span className="is-cta" />
              </span>
            </div>
            <div className={`ua-cfg-bn-preview__banner${webImage ? " is-on" : ""}`}>
              {webImage ? <BannerImage src={webImage} className="ua-cfg-bn-preview__img" /> : "BANNER"}
            </div>
          </div>
        </div>
      ) : (
        <div className="ua-cfg-bn-live-preview__pane ua-cfg-bn-preview__web">
          <span className="ua-cfg-bn-preview__label is-web">Website</span>
          <p className="ua-cfg-panel__sub">Disabled on web.</p>
        </div>
      )}
      {appOn ? (
        <div className="ua-cfg-bn-live-preview__pane ua-cfg-bn-live-preview__pane--app ua-cfg-bn-preview__app">
          <span className="ua-cfg-bn-preview__label is-app">App</span>
          <div className="ua-cfg-bn-live-preview__phone">
            <div className="ua-cfg-bn-live-preview__status">
              <span>9:41</span>
              <span aria-hidden="true">●●● ☑</span>
            </div>
            <div className="ua-cfg-bn-live-preview__app-head">
              <span className="ua-cfg-pt-live-preview__brand">IR</span>
              <strong>Good morning</strong>
              <span className="ua-cfg-bn-live-preview__bell" aria-hidden="true">🔔</span>
            </div>
            <div className={`ua-cfg-bn-preview__banner ua-cfg-bn-preview__banner--app${mobileImage ? " is-on" : ""}`}>
              {mobileImage ? <BannerImage src={mobileImage} className="ua-cfg-bn-preview__img" /> : "BANNER"}
            </div>
            <div className="ua-cfg-bn-live-preview__app-tiles" aria-hidden="true">
              <span className="is-green" />
              <span className="is-blue" />
            </div>
            <div className="ua-cfg-bn-live-preview__app-wide" aria-hidden="true" />
            <div className="ua-cfg-bn-live-preview__nav" aria-hidden="true">
              <span className="is-active">⌂</span>
              <span>🏋</span>
              <span>📈</span>
              <span>👤</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="ua-cfg-bn-live-preview__pane ua-cfg-bn-live-preview__pane--app ua-cfg-bn-preview__app">
          <span className="ua-cfg-bn-preview__label is-app">App</span>
          <p className="ua-cfg-panel__sub">Disabled on app.</p>
        </div>
      )}
    </div>
  );
}
