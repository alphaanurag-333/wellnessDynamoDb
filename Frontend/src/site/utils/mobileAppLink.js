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
  const adminAndroid = str(config?.android_app_link);
  const adminIos = str(config?.ios_app_link);
  const adminPlayQr = str(config?.app_download_qr_link);
  const adminIosQr = str(config?.ios_app_qr_link);

  const androidUrl = adminAndroid || str(MOBILE_APP.androidUrl);
  const iosUrl = adminIos || str(MOBILE_APP.iosUrl);

  const playQrUrl =
    adminPlayQr
    || androidUrl
    || str(MOBILE_APP.playQrUrl)
    || str(MOBILE_APP.qrUrl);

  const iosQrUrl =
    adminIosQr
    || iosUrl
    || str(MOBILE_APP.iosQrUrl)
    || str(MOBILE_APP.qrUrl);

  // Primary QR prefers App Store (desktop / wellnesspedia), then Play.
  const qrUrl = iosQrUrl || playQrUrl;
  const primaryUrl = resolveMobileAppUrl({ androidUrl, iosUrl });

  return {
    androidUrl,
    iosUrl,
    playQrUrl,
    iosQrUrl,
    /** @deprecated Prefer iosQrUrl / playQrUrl — kept for callers that expect one QR */
    qrUrl,
    primaryUrl,
    ctaLabel: str(MOBILE_APP.ctaLabel) || "Download the App",
    headerLabel: str(MOBILE_APP.headerLabel) || "Get the App",
    hasStoreLinks: Boolean(androidUrl || iosUrl),
  };
}
