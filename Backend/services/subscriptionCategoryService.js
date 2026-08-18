const { getAppConfig } = require("../models/appConfigModel");
const { normalizeClientCategory } = require("../models/userAssignmentLogic");

const DEFAULT_PLAN = {
  kind: "heal",
  clientCategory: "individual",
  userTier: "heal",
};

function resolveSubscriptionPlanFromItem(item) {
  if (!item || typeof item !== "object") return { ...DEFAULT_PLAN };

  const explicit = String(item.clientCategory || item.planKind || "").trim().toLowerCase();
  const name = String(item.name || "").trim();

  if (explicit === "eagle" || /\beagle/i.test(name)) {
    return { kind: "eagle", clientCategory: "eagle", userTier: "heal" };
  }

  if (explicit === "maintenance" || /\bmaintenance\b/i.test(name)) {
    return { kind: "maintenance", clientCategory: "individual", userTier: "maintenance" };
  }

  return { ...DEFAULT_PLAN };
}

function resolveClientCategoryFromSubscriptionItem(item) {
  return resolveSubscriptionPlanFromItem(item).clientCategory;
}

function findSubscriptionCatalogItem(config, itemId) {
  const rows = Array.isArray(config?.app_subscription_pricing) ? config.app_subscription_pricing : [];
  if (itemId) {
    const match = rows.find((row) => String(row?.id || "") === String(itemId));
    if (match) return match;
  }
  return null;
}

function resolveSubscriptionPlanFromName(name) {
  return resolveSubscriptionPlanFromItem({ name });
}

async function resolveSubscriptionPlanForPayment({
  catalogItemId,
  catalogItemName,
  config,
} = {}) {
  const appConfig = config || (await getAppConfig());
  const item = findSubscriptionCatalogItem(appConfig, catalogItemId);
  if (item) {
    return resolveSubscriptionPlanFromItem(item);
  }

  return resolveSubscriptionPlanFromItem({ name: catalogItemName });
}

async function resolveClientCategoryForSubscriptionPayment(args) {
  const plan = await resolveSubscriptionPlanForPayment(args);
  return normalizeClientCategory(plan.clientCategory);
}

function isMaintenanceSubscriptionPlan(itemOrPlan) {
  if (!itemOrPlan) return false;
  if (itemOrPlan.kind === "maintenance" || itemOrPlan.userTier === "maintenance") return true;
  return resolveSubscriptionPlanFromItem(itemOrPlan).kind === "maintenance";
}

module.exports = {
  resolveSubscriptionPlanFromItem,
  resolveSubscriptionPlanFromName,
  resolveSubscriptionPlanForPayment,
  resolveClientCategoryFromSubscriptionItem,
  resolveClientCategoryForSubscriptionPayment,
  findSubscriptionCatalogItem,
  isMaintenanceSubscriptionPlan,
};
