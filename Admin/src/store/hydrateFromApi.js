import { store } from "./index.js";
import { setAppConfig } from "./slices/appConfigSlice.js";
import { setAdminProfile } from "./slices/adminProfileSlice.js";

function requestPath(config) {
  const url = String(config?.url || "");
  try {
    return new URL(url, config?.baseURL || "http://local.invalid").pathname;
  } catch {
    return url.split("?")[0];
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function hydrateStoreFromApiResponse(response) {
  const path = requestPath(response?.config);
  const body = response?.data;
  if (!path || !isObject(body)) return;

  const isAppConfigPath =
    /\/(admin|public|account)\/app-config\/?$/.test(path)
    || /\/public\/config\/?$/.test(path);

  if (isAppConfigPath && isObject(body.data)) {
    store.dispatch(setAppConfig(body.data));
    return;
  }

  const isAccountPayload =
    /\/account\/auth\/(me|login|switch-role|refresh-token)\/?$/.test(path);

  if (isAccountPayload && isObject(body.account)) {
    store.dispatch(setAdminProfile(body.account));
  }
}

export function hydrateAdminProfile(account) {
  if (!isObject(account)) return;
  store.dispatch(setAdminProfile(account));
}
