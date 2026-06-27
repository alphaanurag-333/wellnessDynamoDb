const { getAppConfig } = require("../models/appConfigModel");
const {
  getProgramById,
  getEnabledProgramForUser,
} = require("../models/energyExchangeProgramModel");
const { listSubscriptionsByUserId } = require("../models/energyExchangeSubscriptionModel");
const { roundMoney, parseMoney } = require("./consultancyPricingService");

const DEFAULT_FY_START_MONTH = 4; // April
const DEFAULT_FY_OFFSET_COUNT = 4; // current + 3 upcoming

function normalizeFyStartMonth(value, fallback = DEFAULT_FY_START_MONTH) {
  const n = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(n) || n < 1 || n > 12) return fallback;
  return n;
}

/**
 * Given a Date, compute the financial-year window containing it.
 * fyStartYear is the calendar year in which the FY begins.
 */
function getFinancialYear(date, fyStartMonth = DEFAULT_FY_START_MONTH) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid date for FY computation");
  }
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const fyStartYear = month >= fyStartMonth ? year : year - 1;

  const startsAt = new Date(Date.UTC(fyStartYear, fyStartMonth - 1, 1, 0, 0, 0, 0));
  // FY ends at the last instant of the day before the next FY start.
  const nextFyStart = new Date(Date.UTC(fyStartYear + 1, fyStartMonth - 1, 1, 0, 0, 0, 0));
  const endsAt = new Date(nextFyStart.getTime() - 1);

  return {
    fyStartYear,
    fyStartMonth,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

function getFinancialYearByStartYear(fyStartYear, fyStartMonth = DEFAULT_FY_START_MONTH) {
  const year = Number(fyStartYear);
  if (!Number.isFinite(year)) throw new Error("Invalid fyStartYear");
  const startsAt = new Date(Date.UTC(year, fyStartMonth - 1, 1, 0, 0, 0, 0));
  const nextFyStart = new Date(Date.UTC(year + 1, fyStartMonth - 1, 1, 0, 0, 0, 0));
  const endsAt = new Date(nextFyStart.getTime() - 1);
  return {
    fyStartYear: year,
    fyStartMonth,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

/**
 * Months between fromDate and endsAt (inclusive of partial months at the start —
 * "starting this month counts as 1 month").
 */
function monthsRemainingInFy(fromDate, fy) {
  const start = new Date(fromDate);
  const end = new Date(fy.endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (start > end) return 0;

  // Determine the effective starting month — clamp to FY start
  const fyStart = new Date(fy.startsAt);
  const effective = start < fyStart ? fyStart : start;

  const startMonth = effective.getUTCMonth();
  const startYear = effective.getUTCFullYear();
  const endMonth = end.getUTCMonth();
  const endYear = end.getUTCFullYear();

  const diff = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  return Math.max(0, Math.min(12, diff));
}

function activeTimeBasedDiscountPercent(timeBasedDiscount, now) {
  if (!timeBasedDiscount || typeof timeBasedDiscount !== "object") return 0;
  const pct = Number(timeBasedDiscount.percentage);
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  const nowTs = new Date(now).getTime();
  if (timeBasedDiscount.startsAt) {
    const startsTs = new Date(timeBasedDiscount.startsAt).getTime();
    if (Number.isFinite(startsTs) && nowTs < startsTs) return 0;
  }
  if (timeBasedDiscount.endsAt) {
    const endsTs = new Date(timeBasedDiscount.endsAt).getTime();
    if (Number.isFinite(endsTs) && nowTs > endsTs) return 0;
  }
  return Math.max(0, Math.min(100, pct));
}

function computePlanPricing({
  monthsCovered,
  monthlyAmount,
  fyTierDiscountPercent,
  timeBasedDiscountPercent,
  taxPercent,
  taxType,
}) {
  const baseAmount = roundMoney(monthsCovered * monthlyAmount);
  // Stack additively, then cap at 100.
  const stacked = Math.max(0, Math.min(100, (fyTierDiscountPercent || 0) + (timeBasedDiscountPercent || 0)));
  const discountAmount = roundMoney(baseAmount * (stacked / 100));
  const discountedBase = roundMoney(Math.max(0, baseAmount - discountAmount));

  let taxAmount;
  let totalAmount;
  if (String(taxType || "exclusive").toLowerCase() === "inclusive") {
    totalAmount = discountedBase;
    taxAmount = taxPercent > 0 ? roundMoney(totalAmount - totalAmount / (1 + taxPercent / 100)) : 0;
  } else {
    taxAmount = roundMoney(discountedBase * (taxPercent / 100));
    totalAmount = roundMoney(discountedBase + taxAmount);
  }

  return {
    baseAmount,
    effectiveDiscountPercent: stacked,
    discountAmount,
    discountedTotal: discountedBase,
    discountedBase,
    taxAmount,
    taxPercent,
    taxType: String(taxType || "exclusive").toLowerCase(),
    totalAmount,
  };
}

async function _buildPlansForProgram(program, appConfig, { now = new Date() } = {}) {
  if (!program) throw new Error("Program is required");
  const fyStartMonth = normalizeFyStartMonth(appConfig?.fy_start_month);
  const taxPercent = parseMoney(appConfig?.tax_value);
  const taxType = String(appConfig?.tax_type || "exclusive").toLowerCase();
  const monthlyAmount = Number(program.monthlyAmount) || parseMoney(appConfig?.energy_exchange_monthly_amount);
  const timeBasedDiscountPercent = activeTimeBasedDiscountPercent(program.timeBasedDiscount, now);

  const nowDate = now instanceof Date ? now : new Date(now);
  const currentFy = getFinancialYear(nowDate, fyStartMonth);

  const plans = [];
  for (let offset = 0; offset < DEFAULT_FY_OFFSET_COUNT; offset += 1) {
    const fy =
      offset === 0
        ? currentFy
        : getFinancialYearByStartYear(currentFy.fyStartYear + offset, fyStartMonth);

    const monthsCovered =
      offset === 0 ? monthsRemainingInFy(nowDate, fy) : 12;

    if (monthsCovered === 0) {
      continue;
    }

    const fyTierDiscountPercent = Number(program.fyDiscounts?.[String(offset + 1)] ?? 0) || 0;
    // Time-based promotions apply only to the current FY plan card.
    const planTimeBasedDiscountPercent = offset === 0 ? timeBasedDiscountPercent : 0;
    const pricing = computePlanPricing({
      monthsCovered,
      monthlyAmount,
      fyTierDiscountPercent,
      timeBasedDiscountPercent: planTimeBasedDiscountPercent,
      taxPercent,
      taxType,
    });

    const timeBasedDiscountWindow =
      offset === 0 && planTimeBasedDiscountPercent > 0 && program.timeBasedDiscount
        ? {
            percentage: planTimeBasedDiscountPercent,
            startsAt: program.timeBasedDiscount.startsAt || null,
            endsAt: program.timeBasedDiscount.endsAt || null,
            note: program.timeBasedDiscount.note || null,
          }
        : null;

    plans.push({
      offset: offset + 1,
      programId: program.id,
      fyStartYear: fy.fyStartYear,
      fyStartMonth: fy.fyStartMonth,
      startsAt: fy.startsAt,
      endsAt: fy.endsAt,
      label:
        offset === 0
          ? "Current FY"
          : offset === 1
            ? "Next FY"
            : offset === 2
              ? "Next + 1 FY"
              : `Next + ${offset - 1} FY`,
      monthsCovered,
      monthlyAmount,
      currency: program.currency || "INR",
      fyTierDiscountPercent,
      timeBasedDiscountPercent: planTimeBasedDiscountPercent,
      timeBasedDiscountWindow,
      requiresPrerequisite: offset > 0,
      prerequisiteFyStartYears: Array.from({ length: offset }, (_, i) => currentFy.fyStartYear + i),
      ...pricing,
    });
  }

  return { plans, currentFy, fyStartMonth };
}

async function buildFyPlansForProgram(programId, { now = new Date() } = {}) {
  const program = await getProgramById(programId);
  if (!program) {
    const err = new Error("Energy Exchange program not found");
    err.name = "NotFoundError";
    throw err;
  }
  const appConfig = await getAppConfig();
  if (!appConfig) {
    const err = new Error("App configuration not found");
    err.name = "ConfigNotFoundError";
    throw err;
  }
  const { plans, currentFy, fyStartMonth } = await _buildPlansForProgram(program, appConfig, { now });
  return { program, plans, currentFy, fyStartMonth };
}

async function buildFyPlansForUser(userId, { now = new Date() } = {}) {
  const program = await getEnabledProgramForUser(userId);
  if (!program) return { program: null, plans: [], currentFy: null, fyStartMonth: DEFAULT_FY_START_MONTH };
  const appConfig = await getAppConfig();
  const { plans, currentFy, fyStartMonth } = await _buildPlansForProgram(program, appConfig, { now });
  return { program, plans, currentFy, fyStartMonth };
}

/**
 * Validate "no gaps" selection. Ensures user can't buy FY3 unless FY1 + FY2
 * are either already purchased (active/queued) or being purchased in the same order.
 */
async function validatePurchaseSelection(userId, selectedFyStartYears, { now = new Date() } = {}) {
  const selectedSet = new Set(selectedFyStartYears.map((y) => Number(y)));
  if (selectedSet.size === 0) {
    const err = new Error("Select at least one FY plan");
    err.name = "ValidationError";
    throw err;
  }

  const { plans, currentFy } = await buildFyPlansForUser(userId, { now });
  if (!plans.length) {
    const err = new Error("Energy Exchange is not available for this user");
    err.name = "ForbiddenError";
    throw err;
  }

  const validYearsByFy = new Map(plans.map((p) => [p.fyStartYear, p]));
  for (const y of selectedSet) {
    if (!validYearsByFy.has(y)) {
      const err = new Error(`FY ${y} is not available for purchase`);
      err.name = "ValidationError";
      throw err;
    }
  }

  const existing = await listSubscriptionsByUserId(userId, { page: 1, limit: 500 });
  const ownedYears = new Set(
    existing.items
      .filter((s) => ["queued", "active", "pending"].includes(String(s.status).toLowerCase()))
      .map((s) => Number(s.fyStartYear))
  );

  const purchasedOrSelected = new Set([...ownedYears, ...selectedSet]);

  // For each selected FY, prerequisites = each FY strictly before it (starting at currentFy.fyStartYear)
  // must be owned or selected.
  for (const y of selectedSet) {
    const plan = validYearsByFy.get(y);
    for (const prereq of plan.prerequisiteFyStartYears) {
      if (!purchasedOrSelected.has(Number(prereq))) {
        const err = new Error(`Cannot buy FY ${y} without FY ${prereq} first`);
        err.name = "ValidationError";
        throw err;
      }
    }
  }

  const orderedSelectedYears = [...selectedSet].sort((a, b) => a - b);
  const selectedPlans = orderedSelectedYears.map((y) => validYearsByFy.get(y));
  return { plans: selectedPlans, ownedYears: [...ownedYears], currentFy };
}

/**
 * Summarize a checkout for given user + selected FY years.
 */
async function previewCheckout(userId, fyStartYears, { now = new Date() } = {}) {
  const { plans, ownedYears, currentFy } = await validatePurchaseSelection(
    userId,
    fyStartYears,
    { now }
  );
  const summary = plans.reduce(
    (acc, p) => {
      acc.baseAmount = roundMoney(acc.baseAmount + p.baseAmount);
      acc.discountAmount = roundMoney(acc.discountAmount + p.discountAmount);
      acc.taxAmount = roundMoney(acc.taxAmount + p.taxAmount);
      acc.totalAmount = roundMoney(acc.totalAmount + p.totalAmount);
      return acc;
    },
    { baseAmount: 0, discountAmount: 0, taxAmount: 0, totalAmount: 0 }
  );

  return {
    plans,
    ownedYears,
    currentFy,
    pricing: {
      ...summary,
      discountedBase: roundMoney(summary.baseAmount - summary.discountAmount),
      currency: plans[0]?.currency || "INR",
      taxType: plans[0]?.taxType || "exclusive",
      taxPercent: plans[0]?.taxPercent || 0,
    },
  };
}

module.exports = {
  DEFAULT_FY_START_MONTH,
  DEFAULT_FY_OFFSET_COUNT,
  normalizeFyStartMonth,
  getFinancialYear,
  getFinancialYearByStartYear,
  monthsRemainingInFy,
  activeTimeBasedDiscountPercent,
  computePlanPricing,
  buildFyPlansForProgram,
  buildPlansForProgram: _buildPlansForProgram,
  buildFyPlansForUser,
  validatePurchaseSelection,
  previewCheckout,
};
