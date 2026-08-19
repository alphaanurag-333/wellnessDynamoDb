function option(id, label, on = true, extra = {}) {
  return { id, label, on, ...extra };
}

export const DROPDOWN_LISTS = [
  {
    id: "banner-type",
    title: "Banner type",
    options: [
      option("bt-1", "Main banner"),
      option("bt-2", "WellnessPedia banner"),
      option("bt-3", "Program promo banner"),
      option("bt-4", "Festive / offer banner"),
      option("bt-5", "Announcement strip"),
    ],
  },
  {
    id: "banner-headline",
    title: "Banner headline",
    options: [
      option("bh-1", "Reverse it, don't manage it"),
      option("bh-2", "Your labs, your plan, your coach"),
      option("bh-3", "Start your reversal journey"),
      option("bh-4", "Wellness, redefined for Indian bodies"),
    ],
  },
  {
    id: "testimonial-point",
    title: "Testimonial data point",
    options: [
      option("td-1", "Client name"),
      option("td-2", "Age"),
      option("td-3", "Weight lost"),
      option("td-4", "Inches lost"),
      option("td-5", "HbA1c change"),
      option("td-6", "Duration"),
      option("td-7", "City"),
    ],
  },
  {
    id: "discount-slab",
    title: "Discount slab",
    options: [
      option("ds-1", "10% · standard"),
      option("ds-2", "15% · festive"),
      option("ds-3", "20% · annual plan"),
      option("ds-4", "25% · corporate"),
    ],
  },
  {
    id: "yoga-category",
    title: "Yoga & pranayam categories",
    options: [
      option("yg-1", "Morning flow"),
      option("yg-2", "Restorative"),
      option("yg-3", "Pranayam"),
      option("yg-4", "Core & strength"),
      option("yg-5", "Back & neck relief"),
      option("yg-6", "Sleep wind-down"),
      option("yg-7", "Beginner"),
    ],
  },
  {
    id: "recipe-category",
    title: "Recipe categories",
    options: [
      option("rc-1", "Fat loss"),
      option("rc-2", "Protein rich"),
      option("rc-3", "Diabetes friendly"),
      option("rc-4", "Gut reset"),
      option("rc-5", "Low GI"),
      option("rc-6", "PCOD friendly"),
      option("rc-7", "Thyroid friendly"),
      option("rc-8", "High fibre"),
    ],
  },
  {
    id: "banner-placement",
    title: "Banner placement",
    options: [
      option("bp-1", "Home hero · web"),
      option("bp-2", "Web section banner"),
      option("bp-3", "App home carousel"),
      option("bp-4", "App inline card"),
      option("bp-5", "App popup"),
      option("bp-6", "Program page header"),
    ],
  },
  {
    id: "leadership-title",
    title: "Leadership designations",
    options: [
      option("ld-1", "Chief Wellness Officer"),
      option("ld-2", "Head of Clinical Protocols"),
      option("ld-3", "Head of Coaching"),
      option("ld-4", "Head of Operations"),
      option("ld-5", "Medical Advisor"),
    ],
  },
  {
    id: "wellness-title",
    title: "Wellness designations",
    options: [
      option("wd-1", "Wellness Coach"),
      option("wd-2", "Assistant Wellness Coach"),
      option("wd-3", "Functional Nutritionist"),
      option("wd-4", "Yoga & Movement Coach"),
      option("wd-5", "Ayurveda Practitioner"),
      option("wd-6", "Lifestyle Counsellor"),
    ],
  },
];

export const DROPDOWN_SEARCH_MAX = 80;
export const DROPDOWN_LABEL_MAX = 80;
export const DROPDOWN_HEALTH_CONCERN_MAX = 80;
export const DROPDOWN_MEDICAL_QUESTION_MAX = 300;
export const DROPDOWN_MIN_LABEL = 2;
export const DROPDOWN_PACK_SIZE_MAX = 99999;
export const DROPDOWN_PRICE_MAX = 999999;

export function labelLimitForList(slug) {
  if (slug === "medical-questions") return DROPDOWN_MEDICAL_QUESTION_MAX;
  if (slug === "health-concern") return DROPDOWN_HEALTH_CONCERN_MAX;
  return DROPDOWN_LABEL_MAX;
}

export function sanitizeDropdownText(value, maxLen) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, maxLen);
}

export function normalizeDropdownLabel(raw, slug) {
  return sanitizeDropdownText(raw, labelLimitForList(slug)).trim();
}

export function validateDropdownLabel(raw, { slug, options = [], excludeId } = {}) {
  const max = labelLimitForList(slug);
  const value = normalizeDropdownLabel(raw, slug);
  if (!value) return { ok: false, message: "Label is required", value, max };
  if (value.length < DROPDOWN_MIN_LABEL) {
    return { ok: false, message: `Use at least ${DROPDOWN_MIN_LABEL} characters`, value, max };
  }
  const duplicate = options.some(
    (entry) => entry.id !== excludeId
      && String(entry.label || "").trim().toLowerCase() === value.toLowerCase(),
  );
  if (duplicate) {
    return { ok: false, message: "This option already exists in the list", value, max };
  }
  return { ok: true, value, max };
}

export function sanitizePackSizeInput(value) {
  const digits = String(value ?? "").replace(/[^\d]/g, "").slice(0, 5);
  if (!digits) return "";
  const amount = Math.min(Number(digits), DROPDOWN_PACK_SIZE_MAX);
  return String(amount);
}

export function sanitizePriceInput(value) {
  const digits = String(value ?? "").replace(/[^\d]/g, "").slice(0, 7);
  if (!digits) return "";
  const amount = Math.min(Number(digits), DROPDOWN_PRICE_MAX);
  return String(amount);
}

export function validateSupplementMeta(packSizeRaw, unitRaw, priceRaw) {
  const packSize = Number(sanitizePackSizeInput(packSizeRaw)) || 0;
  const unit = String(unitRaw || "").trim();
  const price = Number(sanitizePriceInput(priceRaw)) || 0;
  if (!packSize) return { ok: false, message: "Enter a valid pack size" };
  if (!unit) return { ok: false, message: "Choose a unit" };
  if (!price) return { ok: false, message: "Enter a valid price (Rs.)" };
  return { ok: true, packSize, unit, price };
}
