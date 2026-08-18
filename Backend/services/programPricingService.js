const { getAppConfig } = require("../models/appConfigModel");
const { getUserById } = require("../models/userModel");
const { getPurchasableProgramForUser } = require("../models/userProgramModel");
const { getConsultancyTransactionById } = require("../models/consultancyTransactionModel");
const {
  roundMoney,
  parseMoney,
  getActiveRazorpayGateway,
} = require("./consultancyPricingService");
const {
  getActiveCoachCheckoutOffer,
  getExpiredCoachCheckoutOffer,
  toPublicCoachProgramOffer,
  calculateOfferPricing,
} = require("./coachCheckoutService");

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
  };
}

async function previewCoachProgramOffer(user, offer) {
  const config = await getAppConfig();
  if (!config) throwNamed("App configuration not found", "ConfigNotFoundError");

  const transaction = offer.transactionId
    ? await getConsultancyTransactionById(offer.transactionId)
    : null;
  const pricing = pricingFromTransaction(
    transaction && String(transaction.paymentStatus || "").toLowerCase() === "pending"
      ? transaction
      : null,
    calculateOfferPricing(config, {
      baseAmount: offer.amount,
      discountPercent: offer.discountPercent,
    })
  );

  const gateway = getActiveRazorpayGateway(config);
  const publicOffer = toPublicCoachProgramOffer(offer);

  return {
    source: "coach_checkout",
    program: {
      id: publicOffer.itemId,
      title: publicOffer.itemName,
      price: publicOffer.amount,
      currency: pricing.currency,
      source: "coach_checkout",
    },
    offer: publicOffer,
    pricing,
    paymentGateway: gateway ? { provider: gateway.provider, keyId: gateway.keyId } : null,
    mockPaymentsEnabled: !gateway,
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

  const pricing = calculateProgramPricing(config, { baseAmount: program.price });
  const gateway = getActiveRazorpayGateway(config);

  return {
    source: "assigned_program",
    program: {
      id: program.id,
      catalogProgramId: program.catalogProgramId,
      title: program.title,
      programType: program.programType,
      description: program.description,
      price: program.price,
      currency: program.currency,
    },
    offer: null,
    pricing,
    paymentGateway: gateway ? { provider: gateway.provider, keyId: gateway.keyId } : null,
    mockPaymentsEnabled: !gateway,
  };
}

module.exports = {
  calculateProgramPricing,
  previewProgramCheckout,
};
