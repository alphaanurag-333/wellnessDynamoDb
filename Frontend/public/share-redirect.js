/**
 * https://irwellness.in/share
 * Android → Google Play, iPhone/iPad → App Store, everyone else → the website.
 * Loaded from the site shell so it runs before the app paints.
 */
(function (global) {
  var PLAY_STORE =
    "https://play.google.com/store/apps/details?id=com.irwellness.user&pli=1";
  var APP_STORE = "https://apps.apple.com/us/app/ir-wellness/id6807803878";
  var WEBSITE = "https://irwellness.in/";

  function isShareAppPath(pathname) {
    var path = String(pathname || "/").replace(/\/+$/, "") || "/";
    return path === "/share" || path === "/share/index.html";
  }

  function shareAppDestination(userAgent, nav) {
    var ua = String(userAgent || "");
    var ipadDesktop =
      nav && nav.platform === "MacIntel" && Number(nav.maxTouchPoints) > 1;
    if (/android/i.test(ua)) return PLAY_STORE;
    if (/iPhone|iPad|iPod/i.test(ua) || ipadDesktop) return APP_STORE;
    return WEBSITE;
  }

  function redirectShareApp() {
    if (!isShareAppPath(global.location && global.location.pathname)) return false;
    var target = shareAppDestination(global.navigator && global.navigator.userAgent, global.navigator);
    global.location.replace(target);
    return true;
  }

  global.irwShareAppDestination = function () {
    return shareAppDestination(global.navigator && global.navigator.userAgent, global.navigator);
  };
  global.irwRedirectShareApp = redirectShareApp;
  redirectShareApp();
})(typeof window !== "undefined" ? window : this);
