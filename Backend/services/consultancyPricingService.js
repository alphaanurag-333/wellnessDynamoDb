const { getAppConfig } = require("../models/appConfigModel");
const { getReferralCodeRecord } = require("../models/referralCodeModel");
const { cashfreeBaseUrl } = require("../utils/paymentGateway");

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function parseMoney(value, fallback = 0) {
  const n = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

function getActiveCashfreeGateway(appConfig) {
  const gateways = Array.isArray(appConfig?.payment_gateways) ? appConfig.payment_gateways : [];
  const row = gateways.find((g) => String(g.provider).toLowerCase() === "cashfree" && g.isActive);
  if (!row) return null;

  const mode = String(row.mode || "uat").toLowerCase() === "live" ? "live" : "uat";
  const creds =
    row.credentials && typeof row.credentials === "object"
      ? row.credentials[mode] || {}
      : {};
  const appId = String(creds.app_id || creds.appId || "").trim();
  const secretKey = String(creds.secret_key || creds.secretKey || "").trim();
  if (!appId || !secretKey) return null;

  return {
    provider: "cashfree",
    mode,
    appId,
    secretKey,
    webhookSecret: String(creds.webhook_secret || creds.webhookSecret || "").trim() || null,
    baseUrl: cashfreeBaseUrl(mode),
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
  const gateway = getActiveCashfreeGateway(config);

  return {
    pricing,
    referralCode: referral.valid ? String(referralCode).trim().toUpperCase() : null,
    referralCodeValid: referral.valid,
    paymentGateway: gateway
      ? { provider: gateway.provider, mode: gateway.mode }
      : null,
  };
}

module.exports = {
  roundMoney,
  parseMoney,
  getActiveCashfreeGateway,
  /** @deprecated Use getActiveCashfreeGateway */
  getActiveRazorpayGateway: getActiveCashfreeGateway,
  isReferralCodeValidForDiscount,
  calculateConsultancyPricing,
  buildCheckoutPreview,
};
