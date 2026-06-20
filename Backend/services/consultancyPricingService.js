const { getAppConfig } = require("../models/appConfigModel");
const { getReferralCodeRecord } = require("../models/referralCodeModel");

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function parseMoney(value, fallback = 0) {
  const n = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

function getActiveRazorpayGateway(appConfig) {
  const gateways = Array.isArray(appConfig?.payment_gateways) ? appConfig.payment_gateways : [];
  const row = gateways.find((g) => String(g.provider).toLowerCase() === "razorpay" && g.isActive);
  if (!row) return null;
  const keyId = String(row.credentials?.key_id || "").trim();
  const keySecret = String(row.credentials?.key_secret || "").trim();
  if (!keyId || !keySecret) return null;
  return {
    provider: "razorpay",
    keyId,
    keySecret,
    webhookSecret: String(row.credentials?.webhook_secret || "").trim() || null,
  };
}

async function isReferralCodeValidForDiscount(referralCode) {
  const code = referralCode ? String(referralCode).trim() : "";
  if (!code) return { valid: false, record: null };
  const record = await getReferralCodeRecord(code);
  return { valid: Boolean(record), record };
}

function calculateConsultancyPricing(config, { referralCodeValid = false } = {}) {
  const baseAmount = roundMoney(parseMoney(config?.consultancy_amount));
  const discountAmount = referralCodeValid ? roundMoney(parseMoney(config?.referral_discount)) : 0;
  const taxPercent = parseMoney(config?.tax_value);
  const taxType = String(config?.tax_type || "exclusive").toLowerCase();

  const discountedBase = roundMoney(Math.max(0, baseAmount - discountAmount));

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
    baseAmount,
    discountAmount,
    discountedBase,
    taxAmount,
    taxPercent,
    taxType,
    totalAmount,
    currency: "INR",
    referralDiscountApplied: referralCodeValid && discountAmount > 0,
  };
}

async function buildCheckoutPreview({ referralCode } = {}) {
  const config = await getAppConfig();
  if (!config) {
    const err = new Error("App configuration not found");
    err.name = "ConfigNotFoundError";
    throw err;
  }

  const referral = await isReferralCodeValidForDiscount(referralCode);
  const pricing = calculateConsultancyPricing(config, { referralCodeValid: referral.valid });
  const gateway = getActiveRazorpayGateway(config);

  return {
    pricing,
    referralCode: referral.valid ? String(referralCode).trim().toUpperCase() : null,
    referralCodeValid: referral.valid,
    paymentGateway: gateway
      ? { provider: gateway.provider, keyId: gateway.keyId }
      : null,
    mockPaymentsEnabled: !gateway,
  };
}

module.exports = {
  roundMoney,
  parseMoney,
  getActiveRazorpayGateway,
  isReferralCodeValidForDiscount,
  calculateConsultancyPricing,
  buildCheckoutPreview,
};
