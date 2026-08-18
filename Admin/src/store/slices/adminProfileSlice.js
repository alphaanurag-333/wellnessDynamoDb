import { createSlice } from "@reduxjs/toolkit";

const adminProfileSlice = createSlice({
  name: "adminProfile",
  initialState: {
    data: null,
    status: "idle",
  },
  reducers: {
    setAdminProfile(state, action) {
      if (!action.payload || typeof action.payload !== "object") return;
      state.data = action.payload;
      state.status = "succeeded";
    },
    clearAdminProfile(state) {
      state.data = null;
      state.status = "idle";
    },
  },
});

export const { setAdminProfile, clearAdminProfile } = adminProfileSlice.actions;

export function selectAdminProfile(state) {
  return state.adminProfile.data;
}

export function selectAdminProfileImage(state) {
  return String(state.adminProfile.data?.profileImage || "").trim();
}

export function selectAdminProfileName(state) {
  return String(state.adminProfile.data?.name || "").trim();
}

export default adminProfileSlice.reducer;
