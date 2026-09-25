import {
  categorySlug,
  categoryTitle,
  findCategoryOption,
  recipeCategoryLabel,
} from "./recipesConfigData.js";

/**
 * Public-facing program labels — keep in sync with site footer / Health Solutions nav.
 * Used for display; stored values remain health-concern slugs / ids.
 */
export const PROGRAM_TESTIMONIAL_PROGRAMS = [
  { id: "fat_loss", label: "Fat Loss & Weight Management" },
  { id: "diabetes_reversal", label: "Diabetes Reversal" },
  { id: "pcod_pcos_reversal", label: "PCOD / PCOS Reversal" },
  { id: "thyroid_care", label: "Thyroid Care" },
  { id: "gut_health", label: "Gut Health" },
];

const LABEL_BY_SLUG = new Map(
  PROGRAM_TESTIMONIAL_PROGRAMS.flatMap((entry) => {
    const aliases = [entry.id];
    if (entry.id === "fat_loss") {
      aliases.push("fat_loss_weight_management", "fatloss", "weight_management");
    }
    if (entry.id === "pcod_pcos_reversal") {
      aliases.push("pcod_pcos", "pcod", "pcos", "pmos");
    }
    if (entry.id === "thyroid_care") {
      aliases.push("thyroid");
    }
    if (entry.id === "diabetes_reversal") {
      aliases.push("diabetes", "type_2_diabetes");
    }
    return aliases.map((alias) => [alias, entry.label]);
  }),
);

/** Map a raw concern title / slug to the footer-aligned public label when known. */
export function publicProgramDisplayLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const slug = categorySlug(raw);
  if (LABEL_BY_SLUG.has(slug)) return LABEL_BY_SLUG.get(slug);

  const lower = raw.toLowerCase();
  if (/\bfat\s*loss\b/.test(lower) || /\bweight\s*management\b/.test(lower)) {
    return "Fat Loss & Weight Management";
  }
  if (/\bdiabetes\b/.test(lower)) return "Diabetes Reversal";
  if (/\bpcod\b|\bpcos\b|\bpmos\b/.test(lower)) return "PCOD / PCOS Reversal";
  if (/\bthyroid\b/.test(lower)) return "Thyroid Care";
  if (/\bgut\b/.test(lower)) return "Gut Health";
  return raw;
}

export function mapHealthConcernOptions(concerns = []) {
  return (Array.isArray(concerns) ? concerns : [])
    .filter((row) => row && row.status !== "inactive")
    .map((row) => {
      const title = String(row.title || "").trim();
      const value = categorySlug(title) || String(row.id || "").trim();
      const label = publicProgramDisplayLabel(title || value) || categoryTitle(value);
      return {
        id: row.id,
        value,
        label,
      };
    })
    .filter((row) => row.value && row.label);
}

export function programTestimonialLabel(programId, options = []) {
  const raw = String(programId || "").trim();
  if (!raw) return "";
  if (options.length) {
    const fromOptions = recipeCategoryLabel(raw, options);
    if (fromOptions) return publicProgramDisplayLabel(fromOptions) || fromOptions;
  }
  const mapped = publicProgramDisplayLabel(raw);
  if (mapped && mapped !== raw) return mapped;
  return (
    PROGRAM_TESTIMONIAL_PROGRAMS.find((entry) => entry.id === raw)?.label
    || findCategoryOption(raw, options)?.label
    || categoryTitle(raw)
  );
}

export function resolveProgramSelectValue(value, options = []) {
  const match = findCategoryOption(value, options);
  return match?.value || String(value || "");
}

export const PROGRAM_TESTIMONIAL_STORIES = [];

export const PROGRAM_TESTIMONIAL_GALLERY_OWNERS = [
  "All owners",
  "Anita Rao",
  "Ishita Sen",
  "Rohan Das",
  "Priya Nair",
  "Vishal Chaurasia",
  "Admin",
];

export const PROGRAM_TESTIMONIAL_GALLERY = [];
