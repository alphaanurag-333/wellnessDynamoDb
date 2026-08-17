import {
  categorySlug,
  categoryTitle,
  findCategoryOption,
  recipeCategoryLabel,
} from "./recipesConfigData.js";

/** Legacy fallback labels for older seeded type values. */
export const PROGRAM_TESTIMONIAL_PROGRAMS = [
  { id: "diabetes_reversal", label: "Diabetes Reversal" },
  { id: "pcod_pcos_reversal", label: "PCOD / PCOS Reversal" },
  { id: "thyroid_care", label: "Thyroid Care" },
  { id: "gut_health", label: "Gut Health" },
];

export function mapHealthConcernOptions(concerns = []) {
  return (Array.isArray(concerns) ? concerns : [])
    .filter((row) => row && row.status !== "inactive")
    .map((row) => {
      const label = String(row.title || "").trim();
      const value = categorySlug(label) || String(row.id || "").trim();
      return {
        id: row.id,
        value,
        label: label || categoryTitle(value),
      };
    })
    .filter((row) => row.value && row.label);
}

export function programTestimonialLabel(programId, options = []) {
  const raw = String(programId || "").trim();
  if (!raw) return "";
  if (options.length) {
    const fromOptions = recipeCategoryLabel(raw, options);
    if (fromOptions) return fromOptions;
  }
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
