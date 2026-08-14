export const FOOTER_COLUMNS = [
  {
    id: "ft-programs",
    heading: "Programs",
    links: ["Fat Loss", "Diabetes Reversal", "Thyroid Care", "PCOD"],
    live: true,
  },
  {
    id: "ft-support",
    heading: "Support",
    links: ["Contact us", "FAQ", "Help centre"],
    live: true,
  },
];

export const FOOTER_BOTTOM_LINE =
  "© 2026 India Redefining Wellness Pvt. Ltd. All rights reserved.";

export function joinFooterLinks(links) {
  return (links ?? [])
    .map((entry) => (typeof entry === "string" ? entry : ""))
    .filter(Boolean)
    .join(" · ");
}

export function parseFooterLinks(value) {
  return String(value ?? "")
    .split(/[·|,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}
