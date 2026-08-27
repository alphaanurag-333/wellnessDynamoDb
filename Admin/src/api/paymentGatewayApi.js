import api, { normalizeApiError } from "../api.js";
import {
  mapPaymentGatewaysFromConfig,
  mapPaymentGatewaysToConfig,
} from "../data/configDetailData.js";

function appConfigBase() {
  return "/admin/app-config";
}

export async function getAppPaymentGateways() {
  try {
    const { data } = await api.get(appConfigBase());
    const mapped = mapPaymentGatewaysFromConfig(data?.data?.payment_gateways);
    return mapped;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveAppPaymentGateways(gateways) {
  try {
    const { data } = await api.patch(appConfigBase(), {
      payment_gateways: mapPaymentGatewaysToConfig(gateways),
    });
    return mapPaymentGatewaysFromConfig(data?.data?.payment_gateways);
  } catch (error) {
    normalizeApiError(error);
  }
}
