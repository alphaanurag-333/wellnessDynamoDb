export const BANNER_TYPES = [
  { id: "main", label: "Main banner" },
  { id: "wellnesspedia", label: "Wellnesspedia banner" },
];

export const BANNER_PLACEMENTS = [
  { id: "home-hero-web", label: "Home hero · web · 21:9", ratio: "21:9" },
  { id: "home-hero-app", label: "Home hero · app · 16:9", ratio: "16:9" },
  { id: "programs-web", label: "Programs · web · 16:9", ratio: "16:9" },
];

export const BANNER_COPY = [
  {
    headline: "Reverse it, don't manage it",
    body: "A protocol for metabolic reversal — food, sleep and coaching that actually sticks.",
    cta: "Book a free consult",
  },
  {
    headline: "Preventive wellness, made the norm",
    body: "Daily habits, lab-backed protocols and a coach in your corner.",
    cta: "Start your programme",
  },
  {
    headline: "A country where preventive wellness is the default",
    body: "Join thousands reversing metabolic disease with India Redefining Wellness.",
    cta: "See programmes",
  },
];

export const BANNER_EDITOR = {
  type: "main",
  split: false,
  placement: "home-hero-web",
  headline: BANNER_COPY[0].headline,
  body: BANNER_COPY[0].body,
  cta: BANNER_COPY[0].cta,
  uploaded: false,
  webUploaded: false,
  mobileUploaded: false,
  appOn: true,
  webOn: true,
};

export const BANNER_LIVE_ITEMS = [
  { id: "bn-1", title: "Madhupriya B. · -18 kg", shown: true },
  { id: "bn-2", title: "Bikash S. · HbA1c 8.9 → 6.4", shown: true },
  { id: "bn-3", title: "Hetu M. · cycle regular", shown: true },
];

export const BANNER_GALLERY_OWNERS = ["All owners", "Vishal Chaurasia", "Anita Rao", "Admin", "Marketing"];

export const BANNER_GALLERY = [
  { id: "bg-1", title: "Home hero — reverse it", owner: "Vishal Chaurasia", date: "14 Feb 2026", size: "420 KB", versions: 2, live: true },
  { id: "bg-2", title: "Home hero — dark crop", owner: "Vishal Chaurasia", date: "14 Feb 2026", size: "388 KB", versions: 3, live: false },
  { id: "bg-3", title: "App strip — consult CTA", owner: "Anita Rao", date: "03 Mar 2026", size: "210 KB", versions: 1, live: true },
  { id: "bg-4", title: "Programs banner — summer", owner: "Marketing", date: "22 Mar 2026", size: "512 KB", versions: 2, live: false },
  { id: "bg-5", title: "Wellnesspedia hero", owner: "Admin", date: "08 Apr 2026", size: "460 KB", versions: 1, live: false },
  { id: "bg-6", title: "Home hero — labs", owner: "Admin", date: "18 Apr 2026", size: "401 KB", versions: 4, live: false },
];

export function bannerCopyForHeadline(headline) {
  return BANNER_COPY.find((entry) => entry.headline === headline) ?? BANNER_COPY[0];
}

export function bannerPlacementById(id) {
  return BANNER_PLACEMENTS.find((entry) => entry.id === id) ?? BANNER_PLACEMENTS[0];
}

export function asCopyString(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (typeof value === "object" && typeof value.body === "string") return value.body;
  if (typeof value === "object" && typeof value.text === "string") return value.text;
  return "";
}
