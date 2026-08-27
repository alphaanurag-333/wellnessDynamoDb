const { getAppConfig } = require("../models/appConfigModel");
const { getUserById } = require("../models/userModel");
const { getPurchasableProgramForUser } = require("../models/userProgramModel");
const { getConsultancyTransactionById } = require("../models/consultancyTransactionModel");
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

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toPublicPricingBreakdown(pricing = {}, extras = {}) {
  const baseAmount = money(pricing.baseAmount);
  const discountAmount = money(pricing.discountAmount);
  const discountedBase = money(pricing.discountedBase ?? Math.max(0, baseAmount - discountAmount));
  const taxAmount = money(pricing.taxAmount);
  const taxPercent = money(pricing.taxPercent);
  const taxType = String(pricing.taxType || extras.taxType || "exclusive").toLowerCase() || "exclusive";
  const totalAmount = money(pricing.totalAmount);
  const discountPercent = money(pricing.discountPercent ?? extras.discountPercent);
  const discountLabel = String(pricing.discountLabel || extras.discountLabel || "").trim();
  const currency = pricing.currency || "INR";
  const gstInclusive = taxType === "inclusive";
  const taxLabel =
    taxPercent > 0
      ? `GST (${gstInclusive ? "Inclusive" : "Exclusive"}, ${taxPercent}%)`
      : "GST";
  const discountLineLabel = discountPercent > 0
    ? discountLabel
      ? `Discount (${discountPercent}% · ${discountLabel})`
      : `Discount (${discountPercent}%)`
    : "Discount";

  return {
    currency,
    baseAmount,
    discountPercent,
    discountLabel,
    discountAmount,
    discountedBase,
    taxType,
    taxPercent,
    taxAmount,
    gstAmount: taxAmount,
    gstInclusive,
    taxLabel,
    totalAmount,
    netPayable: totalAmount,
    lines: [
      { key: "base", label: "Base amount", amount: baseAmount },
      { key: "discount", label: discountLineLabel, amount: roundMoney(-discountAmount) },
      { key: "gst", label: taxLabel, amount: taxAmount },
      { key: "total", label: "Payable", amount: totalAmount },
    ],
  };
}

function calculateProgramPricing(config, { baseAmount }) {
  const price = roundMoney(parseMoney(baseAmount));
  const taxPercent = parseMoney(config?.tax_value);
  const taxType = String(config?.tax_type || "exclusive").toLowerCase();

  const base = price;
  const discountAmount = 0;
  const discountedBase = base;

  let taxAmount;
  let totalAmount;

  if (taxType === "inclusive") {
    totalAmount = discountedBase;
    if (taxPercent > 0) {
      taxAmount = roundMoney(totalAmount - totalAmount / (1 + taxPercent / 100));
    } else {
      taxAmount = 0;
    }
  } else {
    taxAmount = roundMoney(discountedBase * (taxPercent / 100));
    totalAmount = roundMoney(discountedBase + taxAmount);
  }

  return {
    baseAmount: base,
    discountAmount,
    discountedBase,
    taxAmount,
    taxPercent,
    taxType,
    totalAmount,
    currency: "INR",
    discountPercent: 0,
    discountLabel: "",
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
    discountPercent: Number(transaction.userSnapshot?.discountPercent) || 0,
    discountLabel: String(transaction.userSnapshot?.discountLabel || "").trim(),
  };
}

async function previewCoachProgramOffer(user, offer) {
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
  const breakdown = toPublicPricingBreakdown(pricing, {
    discountPercent: offer.discountPercent,
    discountLabel: offer.discountLabel,
  });
  const publicOffer = {
    ...toPublicCoachProgramOffer(offer),
    netPayable: breakdown.netPayable,
  };

  return {
    source: "coach_checkout",
    program: {
      id: publicOffer.itemId,
      title: publicOffer.itemName,
      price: breakdown.netPayable,
      listPrice: publicOffer.amount,
      currency: breakdown.currency,
      source: "coach_checkout",
    },
    offer: publicOffer,
    pricing: breakdown,
    paymentGateway: gateway ? { provider: gateway.provider, mode: gateway.mode } : null,
  };
}

async function previewProgramCheckout(userId) {
  const user = await getUserById(userId);
  if (!user) throwNamed("User not found", "NotFoundError");
  if (user.programPurchased) {
    throwNamed("Wellness Program already purchased", "AlreadyPurchasedError");
  }

  const expiredOffer = getExpiredCoachCheckoutOffer(user, "program");
  if (expiredOffer) {
    throwNamed("This payment link has expired", "ValidationError");
  }

  const offer = getActiveCoachCheckoutOffer(user, "program");
  if (offer) {
    return previewCoachProgramOffer(user, offer);
  }

  const program = await getPurchasableProgramForUser(userId);
  if (!program) {
    throwNamed("No purchasable Wellness Program available", "NotFoundError");
  }

  const config = await getAppConfig();
  if (!config) throwNamed("App configuration not found", "ConfigNotFoundError");

  const pricing = toPublicPricingBreakdown(
    calculateProgramPricing(config, { baseAmount: program.price })
  );
  const gateway = getActiveCashfreeGateway(config);

  return {
    source: "assigned_program",
    program: {
      id: program.id,
      catalogProgramId: program.catalogProgramId,
      title: program.title,
      programType: program.programType,
      description: program.description,
      price: pricing.netPayable,
      listPrice: program.price,
      currency: program.currency || pricing.currency,
    },
    offer: null,
    pricing,
    paymentGateway: gateway ? { provider: gateway.provider, mode: gateway.mode } : null,
  };
}

async function resolveProgramPricingForUser(user) {
  if (!user) return null;
  const expiredOffer = getExpiredCoachCheckoutOffer(user, "program");
  if (expiredOffer) return null;
  const offer = getActiveCoachCheckoutOffer(user, "program");
  if (offer) {
    const preview = await previewCoachProgramOffer(user, offer);
    return preview.pricing;
  }
  if (user.programPurchased) return null;
  const program = await getPurchasableProgramForUser(user.id);
  if (!program) return null;
  const config = await getAppConfig();
  if (!config) return null;
  return toPublicPricingBreakdown(calculateProgramPricing(config, { baseAmount: program.price }));
}

module.exports = {
  calculateProgramPricing,
  toPublicPricingBreakdown,
  previewProgramCheckout,
  resolveProgramPricingForUser,
};
