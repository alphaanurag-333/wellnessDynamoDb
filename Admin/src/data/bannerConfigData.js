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

export function emptyBannerEditor() {
  return {
    id: "",
    type: "main",
    split: false,
    placement: "",
    headline: "",
    body: "",
    cta: "",
    ctaLink: "",
    image: "",
    mobileImage: "",
    uploaded: false,
    webUploaded: false,
    mobileUploaded: false,
    appOn: true,
    webOn: true,
    imageFile: null,
    mobileFile: null,
    imagePreview: "",
    mobilePreview: "",
  };
}

export const BANNER_EDITOR = emptyBannerEditor();

export const BANNER_LIVE_ITEMS = [];

export const BANNER_GALLERY_OWNERS = ["All owners"];

export const BANNER_GALLERY = [];

export function mapDropdownOptions(list, fallback = []) {
  const options = (Array.isArray(list?.options) ? list.options : [])
    .filter((row) => row && row.on !== false)
    .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
    .map((row) => {
      const label = String(row.label || row.value || "").trim();
      const value = String(row.value || "").trim() || slugifyOption(label);
      return {
        id: row.id || value,
        label: label || value,
        value,
      };
    })
    .filter((row) => row.value && row.label);
  return options.length ? options : fallback.map((entry) => ({
    id: entry.id,
    label: entry.label,
    value: entry.id,
    ratio: entry.ratio,
  }));
}

export function slugifyOption(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export function optionLabel(value, options = [], fallbacks = []) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match =
    options.find((row) => row.value === raw || row.id === raw || row.label === raw) ||
    fallbacks.find((row) => row.id === raw || row.label === raw);
  return match?.label || raw;
}

export function preserveOption(value, options, fallbacks = []) {
  const raw = String(value || "").trim();
  if (!raw) return options;
  const known = options.some((row) => row.value === raw || row.id === raw || row.label === raw);
  if (known) return options;
  const fallback = fallbacks.find((row) => row.id === raw || row.label === raw);
  return [...options, { id: raw, value: raw, label: fallback?.label || raw, ratio: fallback?.ratio }];
}

export function bannerCopyForHeadline(headline, headlines = BANNER_COPY) {
  return headlines.find((entry) => entry.headline === headline || entry.value === headline) ?? headlines[0] ?? {
    headline: "",
    body: "",
    cta: "",
  };
}

export function placementRatio(placement, options = []) {
  const raw = String(placement || "").toLowerCase();
  const match = options.find((row) => row.value === placement || row.id === placement);
  if (match?.ratio) return match.ratio;
  if (raw.includes("21")) return "21:9";
  if (raw.includes("app") || raw.includes("16")) return "16:9";
  return "16:9";
}

export function bannerPlacementById(id, options = BANNER_PLACEMENTS) {
  const raw = String(id || "").trim();
  const match =
    options.find((row) => row.id === raw || row.value === raw || row.label === raw) ||
    BANNER_PLACEMENTS.find((row) => row.id === raw);
  return {
    id: match?.id || match?.value || raw || BANNER_PLACEMENTS[0].id,
    label: match?.label || raw || BANNER_PLACEMENTS[0].label,
    ratio: match?.ratio || placementRatio(raw, options),
  };
}

export function asCopyString(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (typeof value === "object" && typeof value.body === "string") return value.body;
  if (typeof value === "object" && typeof value.text === "string") return value.text;
  return "";
}
