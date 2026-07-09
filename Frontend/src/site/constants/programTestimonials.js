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

export function getProgramTestimonialMeta(type) {
  return PROGRAM_TESTIMONIAL_TYPES[type] || {
    label: "Program",
    sectionTitle: "Success Stories",
    sectionSubtitle: "Swipe to read testimonials from our community",
  };
}
