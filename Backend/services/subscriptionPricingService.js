const { getAppConfig } = require("../models/appConfigModel");
const { getConsultancyTransactionById } = require("../models/consultancyTransactionModel");
const { getUserById } = require("../models/userModel");
const {
  roundMoney,
  parseMoney,
  getActiveCashfreeGateway,
} = require("./consultancyPricingService");
const {
  getActiveCoachCheckoutOffer,
  getExpiredCoachCheckoutOffer,
  toPublicCoachProgramOffer,
  calculateOfferPricing,
} = require("./coachCheckoutService");

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

function throwNamed(message, name) {
  const err = new Error(message);
  err.name = name;
  throw err;
}

function pricingFromTransaction(transaction, fallback) {
  if (!transaction) return fallback;
  return {
    baseAmount: transaction.baseAmount,
    discountAmount: transaction.discountAmount,
    discountedBase: transaction.discountedBase,
    taxAmount: transaction.taxAmount,
    taxPercent: transaction.taxPercent,
    taxType: transaction.taxType,
    totalAmount: transaction.totalAmount,
    currency: transaction.currency || "INR",
    referralDiscountApplied: false,
  };
}

async function previewCoachSubscriptionOffer(user, offer) {
  const config = await getAppConfig();
  if (!config) throwNamed("App configuration not found", "ConfigNotFoundError");

  const transaction = offer.transactionId
    ? await getConsultancyTransactionById(offer.transactionId)
    : null;
  const freshPricing = calculateOfferPricing(config, {
    baseAmount: offer.amount,
    discountPercent: offer.discountPercent,
  });
  const storedPricing = pricingFromTransaction(
    transaction && String(transaction.paymentStatus || "").toLowerCase() === "pending"
      ? transaction
      : null,
    null
  );
  const pricing =
    storedPricing && Number(storedPricing.totalAmount) === Number(freshPricing.totalAmount)
      ? storedPricing
      : freshPricing;

  const gateway = getActiveCashfreeGateway(config);
  const publicOffer = {
    ...toPublicCoachProgramOffer(offer),
    netPayable: pricing.totalAmount,
  };

  return {
    source: "coach_checkout",
    subscription: {
      id: publicOffer.itemId,
      name: publicOffer.itemName,
      amount: pricing.totalAmount,
      listPrice: publicOffer.amount,
      currency: pricing.currency,
      source: "coach_checkout",
    },
    offer: publicOffer,
    pricing,
    paymentGateway: gateway ? { provider: gateway.provider, mode: gateway.mode } : null,
  };
}

async function buildSubscriptionCheckoutPreview(userId) {
  const user = userId ? await getUserById(userId) : null;
  if (userId && !user) throwNamed("User not found", "NotFoundError");

  const expiredOffer = user ? getExpiredCoachCheckoutOffer(user, "subscription") : null;
  if (expiredOffer) {
    throwNamed("This payment link has expired", "ValidationError");
  }

  const offer = user ? getActiveCoachCheckoutOffer(user, "subscription") : null;
  if (offer) {
    return previewCoachSubscriptionOffer(user, offer);
  }

  const config = await getAppConfig();
  if (!config) throwNamed("App configuration not found", "ConfigNotFoundError");

  const pricing = calculateSubscriptionPricing(config);
  const gateway = getActiveCashfreeGateway(config);

  return {
    source: "default",
    subscription: null,
    offer: null,
    pricing,
    paymentGateway: gateway ? { provider: gateway.provider, mode: gateway.mode } : null,
  };
}

module.exports = {
  calculateSubscriptionPricing,
  buildSubscriptionCheckoutPreview,
};
