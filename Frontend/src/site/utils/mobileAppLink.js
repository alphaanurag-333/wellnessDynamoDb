import { MOBILE_APP } from "../data/siteContent.js";

function str(value) {
  return value != null ? String(value).trim() : "";
}

function isAndroid() {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

function isIOS() {
  return typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Pick the best store / deep link for the current device. */
export function resolveMobileAppUrl({ androidUrl, iosUrl, appName } = {}) {
  const android = str(androidUrl);
  const ios = str(iosUrl);
  const fallbackAndroid =
    android ||
    str(MOBILE_APP.androidUrl) ||
    (appName
      ? `https://play.google.com/store/search?q=${encodeURIComponent(appName)}&c=apps`
      : "");

  const fallbackIos =
    ios ||
    str(MOBILE_APP.iosUrl) ||
    (appName ? `https://apps.apple.com/us/search?term=${encodeURIComponent(appName)}` : "");

  if (isAndroid()) return fallbackAndroid || fallbackIos;
  if (isIOS()) return fallbackIos || fallbackAndroid;
  return fallbackAndroid || fallbackIos;
}

export function buildMobileAppLinks(config, appName) {
  const androidUrl = str(config?.android_app_link) || str(MOBILE_APP.androidUrl);
  const iosUrl = str(config?.ios_app_link) || str(MOBILE_APP.iosUrl);
  const primaryUrl = resolveMobileAppUrl({ androidUrl, iosUrl, appName });

  return {
    androidUrl,
    iosUrl,
    primaryUrl,
    ctaLabel: str(MOBILE_APP.ctaLabel) || "Download the App",
    headerLabel: str(MOBILE_APP.headerLabel) || "Get the App",
    hasStoreLinks: Boolean(androidUrl || iosUrl),
  };
}
