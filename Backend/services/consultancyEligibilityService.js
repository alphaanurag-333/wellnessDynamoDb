const { getAppConfig } = require("../models/appConfigModel");
const { listTransactionsByUserId } = require("../models/consultancyTransactionModel");
const {
  isHealTier,
  isConsultancyOnlyTier,
  normalizeUserTier,
} = require("../models/userAssignmentLogic");
const {
  getFinancialYear,
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

function canBuyConsultancy(userTier) {
  const tier = normalizeUserTier(userTier);
  return tier === "seek" || isConsultancyOnlyTier(tier) || isHealTier(tier);
}

/**
 * Seek, consultancy-only, and Heal users may purchase consultancy any number of times.
 * Each payment is tagged with the current financial year for records.
 */
async function resolveConsultancyPurchaseEligibility(user, { now = new Date() } = {}) {
  const appConfig = await getAppConfig();
  const fyStartMonth = normalizeFyStartMonth(appConfig?.fy_start_month);
  const currentFy = getFinancialYear(now, fyStartMonth);
  const paidFyYears = await listPaidConsultancyFyYears(user.id, fyStartMonth);
  const paidYearsSorted = [...paidFyYears].sort((a, b) => a - b);

  if (!canBuyConsultancy(user.userTier)) {
    return {
      canPurchase: false,
      reason: "invalid_tier",
      purchasableFy: null,
      purchasableFyLabel: null,
      isRenewal: false,
      currentFy: {
        fyStartYear: currentFy.fyStartYear,
        startsAt: currentFy.startsAt,
        endsAt: currentFy.endsAt,
      },
      fyStartMonth,
      paidFyYears: paidYearsSorted,
    };
  }

  const isRenewal = isConsultancyOnlyTier(user.userTier) && paidFyYears.size > 0;
  const label = formatConsultancyFyLabel(currentFy, { isRenewal: false });

  return {
    canPurchase: true,
    reason: null,
    purchasableFy: {
      fyStartYear: currentFy.fyStartYear,
      fyStartMonth: currentFy.fyStartMonth,
      startsAt: currentFy.startsAt,
      endsAt: currentFy.endsAt,
      label,
    },
    purchasableFyLabel: label,
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
