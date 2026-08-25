import { FaApple, FaGooglePlay } from "react-icons/fa";
import { useSiteConfig } from "../hooks/useSiteConfig.js";
import { SiteButton } from "./SiteButton.jsx";

function StoreBadge({ href, label, icon: Icon, tone }) {
  if (!href) return null;
  const toneClass = tone === "light" ? " site-app-badge--light" : "";
  return (
    <a
      className={`site-app-badge site-app-badge--${label === "Google Play" ? "play" : "apple"}${toneClass}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Download on ${label}`}
    >
      <span className="site-app-badge__icon" aria-hidden>
        <Icon size={20} />
      </span>
      <span className="site-app-badge__text">
        <small>{label === "Google Play" ? "Get it on" : "Download on"}</small>
        <strong>{label}</strong>
      </span>
    </a>
  );
}

export function AppDownloadButtons({
  variant = "badges",
  block = false,
  label,
  tone = "dark",
  appleFirst = false,
}) {
  const { mobileApp, appName } = useSiteConfig();
  const { androidUrl, iosUrl, ctaLabel, primaryUrl } = mobileApp;
  const displayLabel = label || ctaLabel;

  if (variant === "primary") {
    return (
      <SiteButton href={primaryUrl} block={block}>
        {displayLabel}
      </SiteButton>
    );
  }

  // Prefer admin-configured store URLs; fall back to device-aware search only if needed.
  const resolvedAndroid =
    androidUrl ||
    (appName
      ? `https://play.google.com/store/search?q=${encodeURIComponent(appName)}&c=apps`
      : "");
  const resolvedIos =
    iosUrl ||
    (appName ? `https://apps.apple.com/us/search?term=${encodeURIComponent(appName)}` : "");
  const apple = <StoreBadge href={resolvedIos} label="App Store" icon={FaApple} tone={tone} />;
  const play = <StoreBadge href={resolvedAndroid} label="Google Play" icon={FaGooglePlay} tone={tone} />;

  if (!resolvedAndroid && !resolvedIos) return null;

  return (
    <div className={`site-app-badges site-app-badges--${tone}${block ? " site-app-badges--block" : ""}`}>
      {appleFirst ? (
        <>
          {apple}
          {play}
        </>
      ) : (
        <>
          {play}
          {apple}
        </>
      )}
    </div>
  );
}
