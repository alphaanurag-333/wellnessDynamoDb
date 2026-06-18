import { FaApple, FaGooglePlay } from "react-icons/fa";
import { useSiteConfig } from "../hooks/useSiteConfig.js";
import { resolveMobileAppUrl } from "../utils/mobileAppLink.js";
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
        <small>Download on</small>
        <strong>{label}</strong>
      </span>
    </a>
  );
}

export function AppDownloadButtons({ variant = "badges", block = false, label, tone = "dark" }) {
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

  const resolvedAndroid = androidUrl || resolveMobileAppUrl({ androidUrl, iosUrl, appName });
  const resolvedIos = iosUrl || resolveMobileAppUrl({ iosUrl, androidUrl, appName });

  return (
    <div className={`site-app-badges site-app-badges--${tone}${block ? " site-app-badges--block" : ""}`}>
      <StoreBadge href={resolvedAndroid} label="Google Play" icon={FaGooglePlay} tone={tone} />
      <StoreBadge href={resolvedIos} label="App Store" icon={FaApple} tone={tone} />
    </div>
  );
}
