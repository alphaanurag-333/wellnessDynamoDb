import api, { normalizeApiError } from "../api.js";

function mapProgram(row, index) {
  return {
    id: String(row?.id || `program-${index + 1}`),
    name: String(row?.name || "").trim(),
    amount: Number(row?.amount) || 0,
    discountPercent: Number(row?.discountPercent) || 0,
    validityHours: Number(row?.validityHours) || 0,
  };
}

function mapSubscription(row, index) {
  return {
    id: String(row?.id || `subscription-${index + 1}`),
    name: String(row?.name || "").trim(),
    amount: Number(row?.amount) || 0,
  };
}

function mapStringOptions(rows, fallback) {
  if (!Array.isArray(rows)) return fallback;
  return rows.map((row) => String(row || "").trim()).filter(Boolean);
}

function mapDiscountSlabs(rows, fallback) {
  if (!Array.isArray(rows)) return fallback;
  return rows
    .map((row) => ({
      pct: Number(row?.pct),
      label: String(row?.label || "").trim(),
    }))
    .filter((row) => Number.isFinite(row.pct) && row.label);
}

export async function getCoachCheckoutOptions(fallbacks) {
  try {
    const { data } = await api.get("/account/app-config");
    const config = data?.data || {};
    const pricing = config.app_program_pricing;
    const subscriptions = config.app_subscription_pricing;
    return {
      programPricing: Array.isArray(pricing)
        ? pricing.map(mapProgram).filter((row) => row.name)
        : null,
      subscriptionPricing: Array.isArray(subscriptions)
        ? subscriptions.map(mapSubscription).filter((row) => row.name)
        : null,
      validityPeriods: mapStringOptions(
        config.coach_validity_periods,
        fallbacks.validityPeriods,
      ),
      discountSlabs: mapDiscountSlabs(
        config.coach_discount_slabs,
        fallbacks.discountSlabs,
      ),
      appHealPeriods: mapStringOptions(
        config.app_heal_validity_periods,
        fallbacks.appHealPeriods,
      ),
      coachesCanAddValidity:
        config.coaches_can_add_validity === undefined
          ? true
          : Boolean(config.coaches_can_add_validity),
      coachesCanAddAppHeal:
        config.coaches_can_add_app_heal === undefined
          ? true
          : Boolean(config.coaches_can_add_app_heal),
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveCoachCheckoutOptions(options, { programPricing, subscriptionPricing } = {}) {
  try {
    const payload = {
      coach_validity_periods: options.validityPeriods,
      coach_discount_slabs: options.discountSlabs,
      app_heal_validity_periods: options.appHealPeriods,
      coaches_can_add_validity: options.coachesCanAddValidity,
      coaches_can_add_app_heal: options.coachesCanAddAppHeal,
    };
    if (programPricing) {
      payload.app_program_pricing = programPricing.map(mapProgram);
    }
    if (subscriptionPricing) {
      payload.app_subscription_pricing = subscriptionPricing.map(mapSubscription);
    }

    const { data } = await api.patch("/account/app-config", payload);
    const config = data?.data || {};
    return {
      programPricing: Array.isArray(config.app_program_pricing)
        ? config.app_program_pricing.map(mapProgram).filter((row) => row.name)
        : [],
      subscriptionPricing: Array.isArray(config.app_subscription_pricing)
        ? config.app_subscription_pricing.map(mapSubscription).filter((row) => row.name)
        : [],
      validityPeriods: mapStringOptions(config.coach_validity_periods, []),
      discountSlabs: mapDiscountSlabs(config.coach_discount_slabs, []),
      appHealPeriods: mapStringOptions(config.app_heal_validity_periods, []),
      coachesCanAddValidity: Boolean(config.coaches_can_add_validity),
      coachesCanAddAppHeal: Boolean(config.coaches_can_add_app_heal),
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function lookupCoachCheckoutClient(code) {
  try {
    const { data } = await api.get("/account/coach-checkout/clients", {
      params: { code },
    });
    return data.client;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function listCoachCheckoutStaff() {
  try {
    const { data } = await api.get("/account/coach-checkout/staff");
    return {
      coaches: Array.isArray(data.coaches) ? data.coaches : [],
      assistants: Array.isArray(data.assistants) ? data.assistants : [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function listRecentPwc(coachId) {
  try {
    const { data } = await api.get("/account/coach-checkout/pwc", {
      params: coachId ? { coachId } : {},
    });
    return Array.isArray(data.items) ? data.items : [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function triggerCoachCheckout(payload) {
  try {
    const { data } = await api.post("/account/coach-checkout/trigger", payload);
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}
