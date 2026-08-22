export const PROGRAM_TESTIMONIAL_TYPES = {
  diabetes_reversal: {
    label: "Diabetes Reversal",
    sectionTitle: "Success Stories",
    sectionSubtitle: "Hear from people who reversed diabetes with our program",
  },
  pcod_pcos_reversal: {
    label: "PCOD / PCOS Reversal",
    sectionTitle: "Success Stories",
    sectionSubtitle: "Real experiences from women who transformed their hormonal health",
  },
  thyroid_care: {
    label: "Thyroid Care",
    sectionTitle: "Success Stories",
    sectionSubtitle: "Stories from clients who restored thyroid balance naturally",
  },
  gut_health: {
    label: "Gut Health",
    sectionTitle: "Success Stories",
    sectionSubtitle: "See how our gut health program changed lives",
  },
};

const TYPE_STOPWORDS = new Set(["reversal", "care", "health", "and", "program", "friendly"]);

function typeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function typeTokens(value) {
  return typeKey(value)
    .split("_")
    .filter((token) => token && !TYPE_STOPWORDS.has(token));
}

/** Match admin health-concern slugs (pcod_pcos) to program page types (pcod_pcos_reversal). */
export function programTestimonialTypeMatches(storedType, requestedType) {
  const stored = typeKey(storedType);
  const requested = typeKey(requestedType);
  if (!stored || !requested) return false;
  if (stored === requested) return true;

  const storedTokens = typeTokens(stored);
  const requestedTokens = typeTokens(requested);
  if (!storedTokens.length || !requestedTokens.length) return false;
  return storedTokens.some((token) => requestedTokens.includes(token));
}

export function getProgramTestimonialMeta(type) {
  return PROGRAM_TESTIMONIAL_TYPES[type] || {
    label: "Program",
    sectionTitle: "Success Stories",
    sectionSubtitle: "Swipe to read testimonials from our community",
  };
}
