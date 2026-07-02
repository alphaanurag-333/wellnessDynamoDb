const { getAppConfig } = require("../models/appConfigModel");
const { getPurchasableProgramForUser } = require("../models/userProgramModel");
const {
  roundMoney,
  parseMoney,
  getActiveRazorpayGateway,
} = require("./consultancyPricingService");

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

async function previewProgramCheckout(userId) {
  const program = await getPurchasableProgramForUser(userId);
  if (!program) {
    const err = new Error("No purchasable Wellness Program available");
    err.name = "NotFoundError";
    throw err;
  }

  const config = await getAppConfig();
  if (!config) {
    const err = new Error("App configuration not found");
    err.name = "ConfigNotFoundError";
    throw err;
  }

  const pricing = calculateProgramPricing(config, { baseAmount: program.price });
  const gateway = getActiveRazorpayGateway(config);

  return {
    program: {
      id: program.id,
      catalogProgramId: program.catalogProgramId,
      title: program.title,
      programType: program.programType,
      description: program.description,
      price: program.price,
      currency: program.currency,
    },
    pricing,
    paymentGateway: gateway ? { provider: gateway.provider, keyId: gateway.keyId } : null,
    mockPaymentsEnabled: !gateway,
  };
}

module.exports = {
  calculateProgramPricing,
  previewProgramCheckout,
};
