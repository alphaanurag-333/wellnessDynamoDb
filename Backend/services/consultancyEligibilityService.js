const { getAppConfig } = require("../models/appConfigModel");
const { listTransactionsByUserId } = require("../models/consultancyTransactionModel");
const {
  isHealTier,
  isConsultancyOnlyTier,
  normalizeUserTier,
} = require("../models/userAssignmentLogic");
const {
  getFinancialYear,
  getFinancialYearByStartYear,
  normalizeFyStartMonth,
} = require("./energyExchangePricingService");

async function listPaidConsultancyFyYears(userId, fyStartMonth) {
  const result = await listTransactionsByUserId(userId, {
    page: 1,
    limit: 100,
    paymentStatus: "paid",
    productType: "consultancy",
  });

  const years = new Set();
  for (const txn of result.items) {
    const explicitYear = Number(txn.fyStartYear);
    if (Number.isFinite(explicitYear) && explicitYear > 0) {
      years.add(explicitYear);
      continue;
    }
    if (txn.paidAt) {
      years.add(getFinancialYear(new Date(txn.paidAt), fyStartMonth).fyStartYear);
    }
  }
  return years;
}

function formatConsultancyFyLabel(fy, { isRenewal = false } = {}) {
  if (!fy) return "";
  if (isRenewal) {
    return `Next Financial Year (FY ${fy.fyStartYear})`;
  }
  return `Current Financial Year (FY ${fy.fyStartYear})`;
}

/**
 * Seek users may buy consultancy for the current FY once.
 * Consultancy-only users may buy the next FY in advance (one FY ahead).
 * Heal members cannot buy consultancy.
 */
async function resolveConsultancyPurchaseEligibility(user, { now = new Date() } = {}) {
  const appConfig = await getAppConfig();
  const fyStartMonth = normalizeFyStartMonth(appConfig?.fy_start_month);
  const currentFy = getFinancialYear(now, fyStartMonth);
  const paidFyYears = await listPaidConsultancyFyYears(user.id, fyStartMonth);
  const paidYearsSorted = [...paidFyYears].sort((a, b) => a - b);

  if (isHealTier(user.userTier)) {
    return {
      canPurchase: false,
      reason: "heal_member",
      purchasableFy: null,
      purchasableFyLabel: null,
      isRenewal: false,
      currentFy,
      fyStartMonth,
      paidFyYears: paidYearsSorted,
    };
  }

  const tier = normalizeUserTier(user.userTier);
  let purchasableFy = null;
  let isRenewal = false;
  let reason = "not_available";

  if (tier === "seek") {
    if (!paidFyYears.has(currentFy.fyStartYear)) {
      purchasableFy = currentFy;
      isRenewal = false;
    } else {
      reason = "already_enrolled";
    }
  } else if (isConsultancyOnlyTier(tier)) {
    const nextFy = getFinancialYearByStartYear(currentFy.fyStartYear + 1, fyStartMonth);
    if (!paidFyYears.has(nextFy.fyStartYear)) {
      purchasableFy = nextFy;
      isRenewal = true;
    } else {
      reason = "next_fy_purchased";
    }
  } else {
    reason = "invalid_tier";
  }

  return {
    canPurchase: Boolean(purchasableFy),
    reason: purchasableFy ? null : reason,
    purchasableFy: purchasableFy
      ? {
          fyStartYear: purchasableFy.fyStartYear,
          fyStartMonth: purchasableFy.fyStartMonth,
          startsAt: purchasableFy.startsAt,
          endsAt: purchasableFy.endsAt,
          label: formatConsultancyFyLabel(purchasableFy, { isRenewal }),
        }
      : null,
    purchasableFyLabel: purchasableFy
      ? formatConsultancyFyLabel(purchasableFy, { isRenewal })
      : null,
    isRenewal,
    currentFy: {
      fyStartYear: currentFy.fyStartYear,
      startsAt: currentFy.startsAt,
      endsAt: currentFy.endsAt,
    },
    fyStartMonth,
    paidFyYears: paidYearsSorted,
  };
}

module.exports = {
  listPaidConsultancyFyYears,
  resolveConsultancyPurchaseEligibility,
  formatConsultancyFyLabel,
};
