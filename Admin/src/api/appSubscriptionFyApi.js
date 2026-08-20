import api, { normalizeApiError } from "../api.js";
import { clipField, parseMoneyField } from "./consultancyAmountApi.js";

export const FY_DISCOUNT_TIERS = [
  { key: "1", label: "Current FY" },
  { key: "2", label: "Next FY" },
  { key: "3", label: "Next-to-next FY" },
  { key: "4", label: "Third successive FY" },
];

export const FY_START_MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const DEFAULT_DISCOUNTS = { "1": 0, "2": 0, "3": 5, "4": 10 };

function appConfigBase() {
  return "/admin/app-config";
}

function normalizeDiscountMap(value) {
  const source = value && typeof value === "object" ? value : {};
  const next = {};
  for (const tier of FY_DISCOUNT_TIERS) {
    const raw = Number(source[tier.key]);
    next[tier.key] = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : DEFAULT_DISCOUNTS[tier.key];
  }
  return next;
}

export function mapAppSubscriptionFy(config = {}) {
  return {
    monthlyAmount: clipField(config.energy_exchange_monthly_amount ?? ""),
    fyStartMonth: String(config.fy_start_month || "4").trim() || "4",
    fyDiscounts: normalizeDiscountMap(config.energy_exchange_default_fy_discounts),
  };
}

export async function getAppSubscriptionFy() {
  try {
    const { data } = await api.get(appConfigBase());
    return mapAppSubscriptionFy(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveAppSubscriptionFy(fields) {
  const monthlyAmount = parseMoneyField(fields?.monthlyAmount);
  if (!monthlyAmount) {
    const err = new Error("Enter a monthly amount greater than 0");
    err.status = 400;
    throw err;
  }
  const fyStartMonth = String(fields?.fyStartMonth || "4").trim();
  const monthNum = Number.parseInt(fyStartMonth, 10);
  if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) {
    const err = new Error("Select a valid FY start month");
    err.status = 400;
    throw err;
  }

  const payload = {
    energy_exchange_monthly_amount: monthlyAmount,
    fy_start_month: String(monthNum),
    energy_exchange_default_fy_discounts: normalizeDiscountMap(fields?.fyDiscounts),
  };

  try {
    const { data } = await api.patch(appConfigBase(), payload);
    return mapAppSubscriptionFy(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}
