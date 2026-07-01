const FY_OFFSETS = ["1", "2", "3", "4"];

const DEFAULT_FY_DISCOUNT_RANGE = { min: 0, max: 100 };

function clampPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, num));
}

function normalizeDiscountRange(value, fallback = DEFAULT_FY_DISCOUNT_RANGE) {
  if (value == null) return { ...fallback };
  let raw = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { ...fallback };
    }
  }
  if (typeof raw !== "object" || Array.isArray(raw)) return { ...fallback };
  const min = clampPercent(raw.min ?? fallback.min);
  const max = clampPercent(raw.max ?? fallback.max);
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

function normalizeFyDiscountRanges(value) {
  const out = {};
  let raw = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = {};
    }
  }
  if (typeof raw !== "object" || raw == null || Array.isArray(raw)) raw = {};
  for (const offset of FY_OFFSETS) {
    out[offset] = normalizeDiscountRange(raw[offset], DEFAULT_FY_DISCOUNT_RANGE);
  }
  return out;
}

function getFyDiscountRange(appConfig, offset) {
  const key = String(offset);
  const ranges = normalizeFyDiscountRanges(appConfig?.energy_exchange_fy_discount_ranges);
  return ranges[key] || { ...DEFAULT_FY_DISCOUNT_RANGE };
}

function getTimeBasedDiscountRange(appConfig) {
  return normalizeDiscountRange(
    appConfig?.energy_exchange_time_based_discount_range,
    DEFAULT_FY_DISCOUNT_RANGE
  );
}

function assertDiscountInRange(percent, range, label) {
  const value = Number(percent);
  if (!Number.isFinite(value)) {
    return `${label} must be a number`;
  }
  if (value < range.min || value > range.max) {
    return `${label} must be between ${range.min}% and ${range.max}%`;
  }
  return null;
}

function validateCoachEnergyExchangeDiscounts({ fyDiscounts, timeBasedDiscount }, appConfig) {
  const fyRanges = normalizeFyDiscountRanges(appConfig?.energy_exchange_fy_discount_ranges);
  const timeRange = getTimeBasedDiscountRange(appConfig);

  if (fyDiscounts != null) {
    let raw = fyDiscounts;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        return "Invalid FY discounts payload";
      }
    }
    if (typeof raw !== "object" || Array.isArray(raw)) {
      return "Invalid FY discounts payload";
    }
    for (const [offset, percent] of Object.entries(raw)) {
      const key = String(offset).trim();
      if (!FY_OFFSETS.includes(key)) continue;
      const err = assertDiscountInRange(
        percent,
        fyRanges[key],
        `FY ${key === "1" ? "current" : `+${Number(key) - 1}`} discount`
      );
      if (err) return err;
    }
  }

  if (timeBasedDiscount != null) {
    let raw = timeBasedDiscount;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        return "Invalid time-based discount payload";
      }
    }
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const percentage = raw.percentage;
      if (percentage != null && String(percentage).trim() !== "") {
        const err = assertDiscountInRange(percentage, timeRange, "Time-based discount");
        if (err) return err;
      }
    }
  }

  return null;
}

function toPublicDiscountLimits(appConfig) {
  return {
    fyDiscountRanges: normalizeFyDiscountRanges(appConfig?.energy_exchange_fy_discount_ranges),
    timeBasedDiscountRange: getTimeBasedDiscountRange(appConfig),
  };
}

module.exports = {
  FY_OFFSETS,
  DEFAULT_FY_DISCOUNT_RANGE,
  clampPercent,
  normalizeDiscountRange,
  normalizeFyDiscountRanges,
  getFyDiscountRange,
  getTimeBasedDiscountRange,
  validateCoachEnergyExchangeDiscounts,
  toPublicDiscountLimits,
};
