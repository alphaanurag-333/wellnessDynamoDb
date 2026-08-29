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
export function resolveMobileAppUrl({ androidUrl, iosUrl } = {}) {
  const android = str(androidUrl);
  const ios = str(iosUrl);

  if (isAndroid()) return android || ios;
  if (isIOS()) return ios || android;
  return android || ios;
}

export function buildMobileAppLinks(config) {
  const androidUrl = str(config?.android_app_link) || str(MOBILE_APP.androidUrl);
  const iosUrl = str(config?.ios_app_link) || str(MOBILE_APP.iosUrl);
  const qrUrl =
    str(config?.app_download_qr_link)
    || str(MOBILE_APP.qrUrl)
    || androidUrl
    || iosUrl;
  const primaryUrl = resolveMobileAppUrl({ androidUrl, iosUrl });

  return {
    androidUrl,
    iosUrl,
    /** Admin QR link when set; otherwise seed/dummy URL. */
    qrUrl,
    primaryUrl,
    ctaLabel: str(MOBILE_APP.ctaLabel) || "Download the App",
    headerLabel: str(MOBILE_APP.headerLabel) || "Get the App",
    hasStoreLinks: Boolean(androidUrl || iosUrl),
  };
}
