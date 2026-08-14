export const SOCIAL_FOOTER_LINKS = [
  { id: "sm-ig", label: "Instagram", url: "instagram.com/irwellness", icon: "instagram" },
  { id: "sm-yt", label: "YouTube", url: "youtube.com/@irwellness", icon: "youtube" },
  { id: "sm-li", label: "LinkedIn", url: "linkedin.com/company/irwellness", icon: "linkedin" },
  { id: "sm-x", label: "X", url: "x.com/irwellness", icon: "x" },
];

export function socialIconForLabel(label) {
  const key = String(label || "").toLowerCase();
  if (key.includes("instagram")) return "instagram";
  if (key.includes("youtube")) return "youtube";
  if (key.includes("linkedin")) return "linkedin";
  if (key === "x" || key.includes("twitter")) return "x";
  if (key.includes("facebook")) return "facebook";
  return "link";
}
