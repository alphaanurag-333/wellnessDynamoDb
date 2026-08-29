export const SOCIAL_MEDIA_FIELDS = [
  { id: "facebook", key: "facebook", label: "Facebook", icon: "facebook", group: "social" },
  { id: "instagram", key: "instagram", label: "Instagram", icon: "instagram", group: "social" },
  { id: "youtube", key: "youtube", label: "YouTube", icon: "youtube", group: "social" },
  { id: "linkedin", key: "linkedin", label: "LinkedIn", icon: "linkedin", group: "social" },
];

export const APP_DOWNLOAD_FIELDS = [
  {
    id: "android",
    key: "android_app_link",
    label: "Google Play",
    icon: "play",
    group: "download",
    hint: "Android app download · play.google.com/store/apps/…",
  },
  {
    id: "ios",
    key: "ios_app_link",
    label: "App Store",
    icon: "apple",
    group: "download",
    hint: "iOS app download · apps.apple.com/app/…",
  },
  {
    id: "play-qr",
    key: "app_download_qr_link",
    label: "Google Play QR link",
    icon: "play",
    group: "download",
    hint: "URL encoded in the Play Store QR on the website",
  },
  {
    id: "ios-qr",
    key: "ios_app_qr_link",
    label: "App Store QR link",
    icon: "apple",
    group: "download",
    hint: "URL encoded in the App Store QR on the website",
  },
];

export const SOCIAL_APP_CONFIG_FIELDS = [...SOCIAL_MEDIA_FIELDS, ...APP_DOWNLOAD_FIELDS];

export const SOCIAL_FOOTER_LINKS = SOCIAL_APP_CONFIG_FIELDS.map((field) => ({
  id: field.id,
  label: field.label,
  url: "",
  icon: field.icon,
}));

export const APP_DOWNLOAD_IDS = new Set(APP_DOWNLOAD_FIELDS.map((field) => field.id));

export function socialIconForLabel(label) {
  const key = String(label || "").toLowerCase();
  if (key.includes("instagram")) return "instagram";
  if (key.includes("youtube")) return "youtube";
  if (key.includes("linkedin")) return "linkedin";
  if (key === "x" || key.includes("twitter")) return "x";
  if (key.includes("facebook")) return "facebook";
  if (key.includes("play") || key.includes("android") || key.includes("google")) return "play";
  if (key.includes("app store") || key.includes("apple") || key.includes("ios")) return "apple";
  return "link";
}

export function toDisplaySocialUrl(value) {
  return String(value || "").trim().replace(/^https?:\/\//i, "");
}

export function toStoredSocialUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return withProtocol.slice(0, 500);
  } catch {
    return null;
  }
}

export function mapSocialLinksFromConfig(config) {
  let playQr = config?.app_download_qr_link || "";
  let iosQr = config?.ios_app_qr_link || "";

  // Legacy: single QR field often held the App Store URL — move it to App Store QR.
  if (!String(iosQr).trim() && /apple\.com|itunes\.apple|apps\.apple/i.test(String(playQr))) {
    iosQr = playQr;
    playQr = config?.android_app_link || "";
  }

  const overrides = {
    app_download_qr_link: playQr,
    ios_app_qr_link: iosQr,
  };

  return SOCIAL_APP_CONFIG_FIELDS.map((field) => ({
    id: field.id,
    label: field.label,
    icon: field.icon,
    hint: field.hint || "",
    url: toDisplaySocialUrl(
      overrides[field.key] !== undefined ? overrides[field.key] : (config?.[field.key] || ""),
    ),
  }));
}

export function mapSocialLinksToConfig(links) {
  const byId = Object.fromEntries((Array.isArray(links) ? links : []).map((row) => [row.id, row]));
  return Object.fromEntries(
    SOCIAL_APP_CONFIG_FIELDS.map((field) => [
      field.key,
      toStoredSocialUrl(byId[field.id]?.url) || "",
    ]),
  );
}
