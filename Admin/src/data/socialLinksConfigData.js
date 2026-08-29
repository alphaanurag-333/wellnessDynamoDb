export const SOCIAL_APP_CONFIG_FIELDS = [
  { id: "facebook", key: "facebook", label: "Facebook", icon: "facebook" },
  { id: "instagram", key: "instagram", label: "Instagram", icon: "instagram" },
  { id: "youtube", key: "youtube", label: "YouTube", icon: "youtube" },
  { id: "linkedin", key: "linkedin", label: "LinkedIn", icon: "linkedin" },
  { id: "android", key: "android_app_link", label: "Google Play", icon: "play" },
  { id: "ios", key: "ios_app_link", label: "App Store", icon: "apple" },
  {
    id: "app-qr",
    key: "app_download_qr_link",
    label: "App download QR link",
    icon: "globe",
  },
];

export const SOCIAL_FOOTER_LINKS = SOCIAL_APP_CONFIG_FIELDS.map((field) => ({
  id: field.id,
  label: field.label,
  url: "",
  icon: field.icon,
}));

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
  return SOCIAL_APP_CONFIG_FIELDS.map((field) => ({
    id: field.id,
    label: field.label,
    icon: field.icon,
    url: toDisplaySocialUrl(config?.[field.key] || ""),
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
