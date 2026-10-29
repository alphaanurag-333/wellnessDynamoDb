const COMPOSITE_PERIOD_SEP = "__";

const PERIOD_LABEL = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  before_1st_meal: "Before 1st Meal",
  before_2nd_meal: "Before 2nd Meal",
  before_3rd_meal: "Before 3rd Meal",
  before_4th_meal: "Before 4th Meal",
  after_1st_meal: "After 1st Meal",
  after_2nd_meal: "After 2nd Meal",
  after_3rd_meal: "After 3rd Meal",
  after_4th_meal: "After 4th Meal",
  empty_stomach_morning: "Empty Stomach (Morning)",
  empty_stomach_evening: "Empty Stomach (Evening)",
  before_bed_30_mins: "30 mins Before Bed",
  after_morning_snacks: "After Morning Snacks",
  before_morning_snacks: "Before Morning Snacks",
  after_evening_snacks: "After Evening Snacks",
  before_evening_snacks: "Before Evening Snacks",
};

const PERIOD_TONE = {
  morning: "morning",
  afternoon: "noon",
  evening: "evening",
  night: "night",
  before_1st_meal: "morning",
  before_2nd_meal: "noon",
  before_3rd_meal: "evening",
  before_4th_meal: "evening",
  after_1st_meal: "morning",
  after_2nd_meal: "noon",
  after_3rd_meal: "evening",
  after_4th_meal: "evening",
  empty_stomach_morning: "morning",
  empty_stomach_evening: "evening",
  before_bed_30_mins: "night",
  after_morning_snacks: "morning",
  before_morning_snacks: "morning",
  after_evening_snacks: "evening",
  before_evening_snacks: "evening",
};

function parseCompositePeriod(period) {
  const raw = String(period || "").trim().toLowerCase();
  const sep = raw.indexOf(COMPOSITE_PERIOD_SEP);
  if (sep <= 0) return null;
  const dayPart = raw.slice(0, sep);
  const mealTiming = raw.slice(sep + COMPOSITE_PERIOD_SEP.length);
  if (!PERIOD_LABEL[dayPart] || !PERIOD_LABEL[mealTiming]) return null;
  return { dayPart, mealTiming };
}

export function resolveSupplementPeriodLabel(period) {
  const key = String(period || "").trim().toLowerCase();
  if (PERIOD_LABEL[key]) return PERIOD_LABEL[key];
  const composite = parseCompositePeriod(key);
  if (composite) {
    return `${PERIOD_LABEL[composite.dayPart]} · ${PERIOD_LABEL[composite.mealTiming]}`;
  }
  return String(period || "").trim();
}

export function resolveSupplementPeriodTone(period) {
  const key = String(period || "").trim().toLowerCase();
  if (PERIOD_TONE[key]) return PERIOD_TONE[key];
  const composite = parseCompositePeriod(key);
  if (composite) {
    return PERIOD_TONE[composite.dayPart] || PERIOD_TONE[composite.mealTiming] || "morning";
  }
  return "morning";
}

/** At-a-glance dosage badges arrive as `periodKey · quantity` from the API. */
export function formatDosageDisplayLabel(label) {
  const raw = String(label || "").trim();
  const sep = raw.indexOf(" · ");
  if (sep <= 0) {
    return raw.includes(COMPOSITE_PERIOD_SEP) ? resolveSupplementPeriodLabel(raw) : raw;
  }
  const periodPart = raw.slice(0, sep).trim();
  const suffix = raw.slice(sep + 3).trim();
  const resolved = resolveSupplementPeriodLabel(periodPart);
  if (resolved === periodPart && !periodPart.includes(COMPOSITE_PERIOD_SEP)) return raw;
  return `${resolved} · ${suffix}`;
}

function periodKeyFromDosageLabel(label) {
  const raw = String(label || "").trim();
  const sep = raw.indexOf(" · ");
  if (sep <= 0) return raw.includes(COMPOSITE_PERIOD_SEP) ? raw : null;
  const periodPart = raw.slice(0, sep).trim();
  return periodPart.includes(COMPOSITE_PERIOD_SEP) ? periodPart : null;
}

export function normalizeAtAGlanceSupplements(supplements) {
  if (!supplements || typeof supplements !== "object") return supplements;
  const items = Array.isArray(supplements.items) ? supplements.items : [];
  return {
    ...supplements,
    items: items.map((row) => ({
      ...row,
      dosages: (row.dosages || []).map((d) => {
        const periodKey = periodKeyFromDosageLabel(d.label);
        const label = formatDosageDisplayLabel(d.label);
        const tone = periodKey ? resolveSupplementPeriodTone(periodKey) : d.tone;
        return { ...d, label, tone };
      }),
    })),
  };
}
