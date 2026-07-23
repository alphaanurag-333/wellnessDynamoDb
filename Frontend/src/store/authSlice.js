import { createSlice } from "@reduxjs/toolkit";

const ADMIN_STORAGE_KEY = "wellness_admin_auth";
const COACH_STORAGE_KEY = "wellness_coach_auth";
const ASSISTANT_STORAGE_KEY = "wellness_assistant_auth";
const STAFF_STORAGE_KEY = "wellness_staff_auth";

function readStoredAdminAuth() {
  if (typeof window === "undefined") {
    return { adminToken: null, refreshToken: null, admin: null };
  }
  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return { adminToken: null, refreshToken: null, admin: null };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { adminToken: null, refreshToken: null, admin: null };

    const adminToken =
      typeof parsed.adminToken === "string"
        ? parsed.adminToken
        : typeof parsed.token === "string"
          ? parsed.token
          : null;
    const refreshToken = typeof parsed.refreshToken === "string" ? parsed.refreshToken : null;
    const admin =
      parsed.admin && typeof parsed.admin === "object"
        ? parsed.admin
        : parsed.user && typeof parsed.user === "object"
          ? parsed.user
          : null;

    return { adminToken, refreshToken, admin };
  } catch {
    return { adminToken: null, refreshToken: null, admin: null };
  }
}

function readStoredPortalAuth(storageKey, tokenField, userField) {
  if (typeof window === "undefined") {
    return { token: null, refreshToken: null, user: null };
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { token: null, refreshToken: null, user: null };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { token: null, refreshToken: null, user: null };

    const token =
      typeof parsed[tokenField] === "string"
        ? parsed[tokenField]
        : typeof parsed.token === "string"
          ? parsed.token
          : typeof parsed.accessToken === "string"
            ? parsed.accessToken
            : null;
    const refreshToken = typeof parsed.refreshToken === "string" ? parsed.refreshToken : null;
    const user =
      parsed[userField] && typeof parsed[userField] === "object"
        ? parsed[userField]
        : parsed.user && typeof parsed.user === "object"
          ? parsed.user
          : null;

    return { token, refreshToken, user };
  } catch {
    return { token: null, refreshToken: null, user: null };
  }
}

function writeStoredAdminAuth(adminToken, refreshToken, admin) {
  if (typeof window === "undefined") return;
  if (adminToken && refreshToken && admin) {
    window.localStorage.setItem(
      ADMIN_STORAGE_KEY,
      JSON.stringify({ adminToken, refreshToken, admin }),
    );
  } else {
    window.localStorage.removeItem(ADMIN_STORAGE_KEY);
  }
}

function writeStoredPortalAuth(storageKey, tokenField, userField, token, refreshToken, user) {
  if (typeof window === "undefined") return;
  if (token && refreshToken && user) {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ [tokenField]: token, refreshToken, [userField]: user }),
    );
  } else {
    window.localStorage.removeItem(storageKey);
  }
}

const adminAuth = readStoredAdminAuth();
const coachAuth = readStoredPortalAuth(COACH_STORAGE_KEY, "coachToken", "coach");
const assistantAuth = readStoredPortalAuth(ASSISTANT_STORAGE_KEY, "assistantToken", "assistant");
// Unified Staff RBAC Panel (M7) — one auth slot for Admin/Coach/Assistant
// logging in through `/panel/login` (`/api/staff/auth/*`), alongside (not
// replacing) the three legacy slots above until M8's cutover.
const staffAuth = readStoredPortalAuth(STAFF_STORAGE_KEY, "staffToken", "staffAccount");

const initialState = {
  adminToken: adminAuth.adminToken,
  refreshToken: adminAuth.refreshToken,
  admin: adminAuth.admin,
  coachToken: coachAuth.token,
  coachRefreshToken: coachAuth.refreshToken,
  coach: coachAuth.user,
  assistantToken: assistantAuth.token,
  assistantRefreshToken: assistantAuth.refreshToken,
  assistant: assistantAuth.user,
  staffToken: staffAuth.token,
  staffRefreshToken: staffAuth.refreshToken,
  staffAccount: staffAuth.user,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.adminToken = action.payload.adminToken;
      state.refreshToken = action.payload.refreshToken ?? null;
      state.admin = action.payload.admin;
      writeStoredAdminAuth(state.adminToken, state.refreshToken, state.admin);
    },
    setAdmin(state, action) {
      state.admin = action.payload;
      writeStoredAdminAuth(state.adminToken, state.refreshToken, state.admin);
    },
    setTokens(state, action) {
      state.adminToken = action.payload.adminToken ?? state.adminToken;
      state.refreshToken = action.payload.refreshToken ?? state.refreshToken;
      writeStoredAdminAuth(state.adminToken, state.refreshToken, state.admin);
    },
    setCoachCredentials(state, action) {
      state.coachToken = action.payload.coachToken;
      state.coachRefreshToken = action.payload.refreshToken ?? null;
      state.coach = action.payload.coach;
      writeStoredPortalAuth(
        COACH_STORAGE_KEY,
        "coachToken",
        "coach",
        state.coachToken,
        state.coachRefreshToken,
        state.coach,
      );
    },
    setCoach(state, action) {
      state.coach = action.payload;
      writeStoredPortalAuth(
        COACH_STORAGE_KEY,
        "coachToken",
        "coach",
        state.coachToken,
        state.coachRefreshToken,
        state.coach,
      );
    },
    setCoachTokens(state, action) {
      state.coachToken = action.payload.coachToken ?? state.coachToken;
      state.coachRefreshToken = action.payload.refreshToken ?? state.coachRefreshToken;
      writeStoredPortalAuth(
        COACH_STORAGE_KEY,
        "coachToken",
        "coach",
        state.coachToken,
        state.coachRefreshToken,
        state.coach,
      );
    },
    setAssistantCredentials(state, action) {
      state.assistantToken = action.payload.assistantToken;
      state.assistantRefreshToken = action.payload.refreshToken ?? null;
      state.assistant = action.payload.assistant;
      writeStoredPortalAuth(
        ASSISTANT_STORAGE_KEY,
        "assistantToken",
        "assistant",
        state.assistantToken,
        state.assistantRefreshToken,
        state.assistant,
      );
    },
    setAssistant(state, action) {
      state.assistant = action.payload;
      writeStoredPortalAuth(
        ASSISTANT_STORAGE_KEY,
        "assistantToken",
        "assistant",
        state.assistantToken,
        state.assistantRefreshToken,
        state.assistant,
      );
    },
    setAssistantTokens(state, action) {
      state.assistantToken = action.payload.assistantToken ?? state.assistantToken;
      state.assistantRefreshToken = action.payload.refreshToken ?? state.assistantRefreshToken;
      writeStoredPortalAuth(
        ASSISTANT_STORAGE_KEY,
        "assistantToken",
        "assistant",
        state.assistantToken,
        state.assistantRefreshToken,
        state.assistant,
      );
    },
    logout(state) {
      state.adminToken = null;
      state.refreshToken = null;
      state.admin = null;
      writeStoredAdminAuth(null, null, null);
    },
    logoutCoach(state) {
      state.coachToken = null;
      state.coachRefreshToken = null;
      state.coach = null;
      writeStoredPortalAuth(COACH_STORAGE_KEY, "coachToken", "coach", null, null, null);
    },
    logoutAssistant(state) {
      state.assistantToken = null;
      state.assistantRefreshToken = null;
      state.assistant = null;
      writeStoredPortalAuth(ASSISTANT_STORAGE_KEY, "assistantToken", "assistant", null, null, null);
    },
    setStaffCredentials(state, action) {
      state.staffToken = action.payload.staffToken;
      state.staffRefreshToken = action.payload.refreshToken ?? null;
      state.staffAccount = action.payload.staffAccount;
      writeStoredPortalAuth(
        STAFF_STORAGE_KEY,
        "staffToken",
        "staffAccount",
        state.staffToken,
        state.staffRefreshToken,
        state.staffAccount,
      );
    },
    setStaffAccount(state, action) {
      state.staffAccount = action.payload;
      writeStoredPortalAuth(
        STAFF_STORAGE_KEY,
        "staffToken",
        "staffAccount",
        state.staffToken,
        state.staffRefreshToken,
        state.staffAccount,
      );
    },
    setStaffTokens(state, action) {
      state.staffToken = action.payload.staffToken ?? state.staffToken;
      state.staffRefreshToken = action.payload.refreshToken ?? state.staffRefreshToken;
      writeStoredPortalAuth(
        STAFF_STORAGE_KEY,
        "staffToken",
        "staffAccount",
        state.staffToken,
        state.staffRefreshToken,
        state.staffAccount,
      );
    },
    logoutStaff(state) {
      state.staffToken = null;
      state.staffRefreshToken = null;
      state.staffAccount = null;
      writeStoredPortalAuth(STAFF_STORAGE_KEY, "staffToken", "staffAccount", null, null, null);
    },
  },
});

export const {
  setCredentials,
  setAdmin,
  setTokens,
  setCoachCredentials,
  setCoach,
  setCoachTokens,
  setAssistantCredentials,
  setAssistant,
  setAssistantTokens,
  logout,
  logoutCoach,
  logoutAssistant,
  setStaffCredentials,
  setStaffAccount,
  setStaffTokens,
  logoutStaff,
} = authSlice.actions;
export default authSlice.reducer;
