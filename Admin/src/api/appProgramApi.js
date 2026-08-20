import api, { normalizeApiError } from "../api.js";

function mapProgram(row, index) {
  const programType = String(row?.programType || row?.type || "goal_based")
    .trim()
    .toLowerCase();
  return {
    id: String(row?.id || `program-${index + 1}`),
    name: String(row?.name || "").trim(),
    amount: Number(row?.amount) || 0,
    discountPercent: Number(row?.discountPercent) || 0,
    validityHours: Number(row?.validityHours) || 0,
    programType: ["goal_based", "lifetime", "eagle"].includes(programType)
      ? programType
      : "goal_based",
  };
}

function mapSubscription(row, index) {
  const mapped = {
    id: String(row?.id || `subscription-${index + 1}`),
    name: String(row?.name || "").trim(),
    amount: Number(row?.amount) || 0,
    clientCategory: String(row?.clientCategory || "").trim().toLowerCase(),
  };
  if (row?.days !== undefined) mapped.days = Number(row.days) || 0;
  return mapped;
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
    const legacyValidityPeriods = config.coach_validity_periods;
    const legacyDiscountSlabs = config.coach_discount_slabs;
    return {
      programPricing: Array.isArray(pricing)
        ? pricing.map(mapProgram).filter((row) => row.name)
        : null,
      subscriptionPricing: Array.isArray(subscriptions)
        ? subscriptions.map(mapSubscription).filter((row) => row.name)
        : null,
      programValidityPeriods: mapStringOptions(
        config.app_program_validity_periods ?? legacyValidityPeriods,
        fallbacks.validityPeriods,
      ),
      programDiscountSlabs: mapDiscountSlabs(
        config.app_program_discount_slabs ?? legacyDiscountSlabs,
        fallbacks.discountSlabs,
      ),
      subscriptionValidityPeriods: mapStringOptions(
        config.app_subscription_validity_periods ?? legacyValidityPeriods,
        fallbacks.validityPeriods,
      ),
      subscriptionDiscountSlabs: mapDiscountSlabs(
        config.app_subscription_discount_slabs ?? legacyDiscountSlabs,
        fallbacks.discountSlabs,
      ),
      appHealPeriods: mapStringOptions(
        config.app_heal_validity_periods,
        fallbacks.appHealPeriods,
      ),
      coachesCanAddProgramValidity:
        (config.coaches_can_add_program_validity ?? config.coaches_can_add_validity) === undefined
          ? true
          : Boolean(config.coaches_can_add_program_validity ?? config.coaches_can_add_validity),
      coachesCanAddSubscriptionValidity:
        (config.coaches_can_add_subscription_validity ?? config.coaches_can_add_validity) === undefined
          ? true
          : Boolean(config.coaches_can_add_subscription_validity ?? config.coaches_can_add_validity),
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
    const payload = {};
    if (options.programValidityPeriods !== undefined) {
      payload.app_program_validity_periods = options.programValidityPeriods;
    }
    if (options.programDiscountSlabs !== undefined) {
      payload.app_program_discount_slabs = options.programDiscountSlabs;
    }
    if (options.subscriptionValidityPeriods !== undefined) {
      payload.app_subscription_validity_periods = options.subscriptionValidityPeriods;
    }
    if (options.subscriptionDiscountSlabs !== undefined) {
      payload.app_subscription_discount_slabs = options.subscriptionDiscountSlabs;
    }
    if (options.appHealPeriods !== undefined) {
      payload.app_heal_validity_periods = options.appHealPeriods;
    }
    if (options.coachesCanAddProgramValidity !== undefined) {
      payload.coaches_can_add_program_validity = options.coachesCanAddProgramValidity;
    }
    if (options.coachesCanAddSubscriptionValidity !== undefined) {
      payload.coaches_can_add_subscription_validity = options.coachesCanAddSubscriptionValidity;
    }
    if (options.coachesCanAddAppHeal !== undefined) {
      payload.coaches_can_add_app_heal = options.coachesCanAddAppHeal;
    }
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
      programValidityPeriods: mapStringOptions(config.app_program_validity_periods, []),
      programDiscountSlabs: mapDiscountSlabs(config.app_program_discount_slabs, []),
      subscriptionValidityPeriods: mapStringOptions(config.app_subscription_validity_periods, []),
      subscriptionDiscountSlabs: mapDiscountSlabs(config.app_subscription_discount_slabs, []),
      appHealPeriods: mapStringOptions(config.app_heal_validity_periods, []),
      coachesCanAddProgramValidity: Boolean(config.coaches_can_add_program_validity),
      coachesCanAddSubscriptionValidity: Boolean(config.coaches_can_add_subscription_validity),
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

export async function remindCoachCheckout(transactionId) {
  try {
    const { data } = await api.post(
      `/account/coach-checkout/transactions/${encodeURIComponent(transactionId)}/remind`
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function listCoachCheckoutHistory(userId) {
  try {
    const { data } = await api.get("/account/coach-checkout/transactions", {
      params: { userId },
    });
    return Array.isArray(data.history) ? data.history : [];
  } catch (error) {
    normalizeApiError(error);
  }
}

function filenameFromDisposition(header) {
  const value = String(header || "");
  const utf = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf?.[1]) return decodeURIComponent(utf[1]);
  const plain = value.match(/filename="?([^"]+)"?/i);
  return plain?.[1] || "invoice.pdf";
}

export async function downloadCoachCheckoutInvoice(transactionId) {
  try {
    const { data, headers } = await api.get(
      `/account/coach-checkout/transactions/${encodeURIComponent(transactionId)}/invoice`,
      { responseType: "blob" },
    );
    const blob = data instanceof Blob ? data : new Blob([data], { type: "application/pdf" });
    if (blob.type && blob.type.includes("application/json")) {
      const parsed = JSON.parse(await blob.text());
      throw new Error(parsed.message || "Could not download invoice");
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filenameFromDisposition(headers?.["content-disposition"]);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    const blob = error?.response?.data;
    if (blob instanceof Blob) {
      let message = "Could not download invoice";
      try {
        const parsed = JSON.parse(await blob.text());
        if (parsed?.message) message = parsed.message;
      } catch {
        // keep fallback
      }
      throw new Error(message);
    }
    if (error instanceof Error && !error.response) throw error;
    normalizeApiError(error);
  }
}
