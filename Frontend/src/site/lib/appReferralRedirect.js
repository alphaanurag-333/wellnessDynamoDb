/** https://www.irwellness.in/app?ref=CODE — store links with referral attribution. */

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.irwellness.user";
export const APP_STORE_URL =
  "https://apps.apple.com/us/app/ir-wellness/id6807803878";
export const WEBSITE_FALLBACK = "https://irwellness.in/";

export function normalizeReferralCode(code) {
  return String(code || "").trim().toUpperCase();
}

export function parseReferralRef(search) {
  const rawSearch =
    typeof search === "string"
      ? search.startsWith("?")
        ? search
        : `?${search}`
      : "";
  const params =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(rawSearch || (typeof window !== "undefined" ? window.location.search : ""));
  const raw =
    params.get("ref") || params.get("referralCode") || params.get("referral_code") || "";
  return normalizeReferralCode(raw);
}

export function isAppReferralPath(pathname) {
  const path = String(pathname || "/").replace(/\/+$/, "") || "/";
  return path === "/app";
}

export function detectAppReferralPlatform(userAgent, nav) {
  const ua = String(userAgent || "");
  const ipadDesktop =
    nav && nav.platform === "MacIntel" && Number(nav.maxTouchPoints) > 1;
  if (/android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua) || ipadDesktop) return "ios";
  return "other";
}

export function buildPlayStoreUrl(referralCode) {
  const url = new URL(PLAY_STORE_URL);
  const code = normalizeReferralCode(referralCode);
  if (code) {
    url.searchParams.set("referrer", `ref=${code}`);
  }
  return url.toString();
}

export function buildAppStoreUrl(referralCode) {
  const url = new URL(APP_STORE_URL);
  const code = normalizeReferralCode(referralCode);
  if (code) {
    url.searchParams.set("ref", code);
  }
  return url.toString();
}

/** @returns {string|null} Store URL for mobile, or null when the page should render (desktop). */
export function resolveAppReferralRedirectUrl({ pathname, search, userAgent, navigator: nav }) {
  if (!isAppReferralPath(pathname)) return null;
  const ref = parseReferralRef(search);
  const platform = detectAppReferralPlatform(userAgent, nav);
  if (platform === "android") return buildPlayStoreUrl(ref);
  if (platform === "ios") return buildAppStoreUrl(ref);
  return null;
}
