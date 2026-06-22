const { getAppConfig } = require("../models/appConfigModel");
const {
  roundMoney,
  parseMoney,
  getActiveRazorpayGateway,
} = require("./consultancyPricingService");

function calculateSubscriptionPricing(config) {
  const baseAmount = roundMoney(parseMoney(config?.subscription_amount));
  const taxPercent = parseMoney(config?.tax_value);
  const taxType = String(config?.tax_type || "exclusive").toLowerCase();

  let taxAmount;
  let totalAmount;

  if (taxType === "inclusive") {
    totalAmount = baseAmount;
    taxAmount = taxPercent > 0 ? roundMoney(totalAmount - totalAmount / (1 + taxPercent / 100)) : 0;
  } else {
    taxAmount = roundMoney(baseAmount * (taxPercent / 100));
    totalAmount = roundMoney(baseAmount + taxAmount);
  }

  return {
    baseAmount,
    discountAmount: 0,
    discountedBase: baseAmount,
    taxAmount,
    taxPercent,
    taxType,
    totalAmount,
    currency: "INR",
    referralDiscountApplied: false,
  };
}

async function buildSubscriptionCheckoutPreview() {
  const config = await getAppConfig();
  if (!config) {
    const err = new Error("App configuration not found");
    err.name = "ConfigNotFoundError";
    throw err;
  }

  const pricing = calculateSubscriptionPricing(config);
  const gateway = getActiveRazorpayGateway(config);

  return {
    pricing,
    paymentGateway: gateway ? { provider: gateway.provider, keyId: gateway.keyId } : null,
    mockPaymentsEnabled: !gateway,
  };
}

module.exports = {
  calculateSubscriptionPricing,
  buildSubscriptionCheckoutPreview,
};
