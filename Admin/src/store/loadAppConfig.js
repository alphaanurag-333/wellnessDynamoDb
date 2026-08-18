import api from "../api.js";
import { store } from "./index.js";
import {
  setAppConfigError,
  setAppConfigStatus,
} from "./slices/appConfigSlice.js";

export async function loadAppConfig({ publicOnly = false } = {}) {
  store.dispatch(setAppConfigStatus("loading"));
  try {
    if (!publicOnly) {
      try {
        await api.get("/admin/app-config");
        return store.getState().appConfig.data;
      } catch (error) {
        const status = error?.response?.status;
        if (status !== 401 && status !== 403) throw error;
      }
    }
    await api.get("/public/app-config");
    return store.getState().appConfig.data;
  } catch (error) {
    const message =
      error?.response?.data?.message || error?.message || "Failed to load app config";
    store.dispatch(setAppConfigError(message));
    return null;
  }
}
