import { createSlice } from "@reduxjs/toolkit";

const FALLBACK_APP_NAME = "India Redefining Wellness";

const appConfigSlice = createSlice({
  name: "appConfig",
  initialState: {
    data: null,
    status: "idle",
    error: null,
  },
  reducers: {
    setAppConfig(state, action) {
      if (!action.payload || typeof action.payload !== "object") return;
      // Merge so a public payload (no admin_logo) does not wipe a prior admin fetch.
      state.data = { ...(state.data || {}), ...action.payload };
      state.status = "succeeded";
      state.error = null;
    },
    setAppConfigStatus(state, action) {
      state.status = action.payload || "idle";
    },
    setAppConfigError(state, action) {
      state.status = "failed";
      state.error = action.payload || "Failed to load app config";
    },
    clearAppConfig(state) {
      state.data = null;
      state.status = "idle";
      state.error = null;
    },
  },
});

export const {
  setAppConfig,
  setAppConfigStatus,
  setAppConfigError,
  clearAppConfig,
} = appConfigSlice.actions;

export function selectAppConfig(state) {
  return state.appConfig.data;
}

export function selectAppConfigStatus(state) {
  return state.appConfig.status;
}

export function selectAppName(state) {
  const name = String(state.appConfig.data?.app_name || "").trim();
  return name || FALLBACK_APP_NAME;
}

export function selectAdminLogoUrl(state) {
  const config = state.appConfig.data || {};
  return String(config.admin_logo || config.user_logo || "").trim();
}

export function selectUserLogoUrl(state) {
  return String(state.appConfig.data?.user_logo || "").trim();
}

export default appConfigSlice.reducer;
