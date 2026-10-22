/**
 * https://www.irwellness.in/app?ref=CODE
 * Android → Play Store (referrer=ref%3DCODE), iOS → App Store (?ref=CODE).
 * Keep in sync with src/site/lib/appReferralRedirect.js
 */
(function (global) {
  var PLAY_STORE =
    "https://play.google.com/store/apps/details?id=com.irwellness.user";
  var APP_STORE =
    "https://apps.apple.com/us/app/ir-wellness/id6807803878";

  function normalizeReferralCode(code) {
    return String(code || "").trim().toUpperCase();
  }

  function isAppReferralPath(pathname) {
    var path = String(pathname || "/").replace(/\/+$/, "") || "/";
    return path === "/app";
  }

  function parseReferralRef(search) {
    var params = new URLSearchParams(search || (global.location && global.location.search) || "");
    var raw =
      params.get("ref") ||
      params.get("referralCode") ||
      params.get("referral_code") ||
      "";
    return normalizeReferralCode(raw);
  }

  function detectPlatform(userAgent, nav) {
    var ua = String(userAgent || "");
    var ipadDesktop =
      nav && nav.platform === "MacIntel" && Number(nav.maxTouchPoints) > 1;
    if (/android/i.test(ua)) return "android";
    if (/iPhone|iPad|iPod/i.test(ua) || ipadDesktop) return "ios";
    return "other";
  }

  function buildPlayStoreUrl(referralCode) {
    var url = new URL(PLAY_STORE);
    var code = normalizeReferralCode(referralCode);
    if (code) url.searchParams.set("referrer", "ref=" + code);
    return url.toString();
  }

  function buildAppStoreUrl(referralCode) {
    var url = new URL(APP_STORE);
    var code = normalizeReferralCode(referralCode);
    if (code) url.searchParams.set("ref", code);
    return url.toString();
  }

  function resolveRedirectUrl(pathname, search, userAgent, nav) {
    if (!isAppReferralPath(pathname)) return null;
    var ref = parseReferralRef(search);
    var platform = detectPlatform(userAgent, nav);
    if (platform === "android") return buildPlayStoreUrl(ref);
    if (platform === "ios") return buildAppStoreUrl(ref);
    return null;
  }

  function redirectAppReferral() {
    if (!isAppReferralPath(global.location && global.location.pathname)) return false;
    var target = resolveRedirectUrl(
      global.location.pathname,
      global.location.search,
      global.navigator && global.navigator.userAgent,
      global.navigator,
    );
    if (!target) return false;
    global.location.replace(target);
    return true;
  }

  global.irwResolveAppReferralRedirectUrl = function (search) {
    return resolveRedirectUrl(
      global.location && global.location.pathname,
      search != null ? search : global.location && global.location.search,
      global.navigator && global.navigator.userAgent,
      global.navigator,
    );
  };
  global.irwBuildPlayStoreUrl = buildPlayStoreUrl;
  global.irwBuildAppStoreUrl = buildAppStoreUrl;
  global.irwParseReferralRef = parseReferralRef;
  global.irwRedirectAppReferral = redirectAppReferral;
  redirectAppReferral();
})(typeof window !== "undefined" ? window : this);
