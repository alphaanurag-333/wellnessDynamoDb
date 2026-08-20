/**
 * Dual-read staff identity resolver.
 * Prefer Account table; fall back to legacy Admin / WellnessCoach / AssistantWellnessCoach.
 */
const {
  getAccountById,
  getAccountByEmail,
  hasActiveMembership,
  getMembership,
  toPublicAccount,
} = require("../models/accountModel");
const { getAdminById, getAdminByEmail, toPublicAdmin } = require("../models/adminModel");
const {
  getWellnessCoachById,
  getWellnessCoachRecordById,
  getWellnessCoachByEmail,
  toPublicWellnessCoach,
} = require("../models/wellnessCoachModel");
const {
  getAssistantWellnessCoachById,
  getAssistantWellnessCoachRecordById,
  getAssistantByEmail,
  toPublicAssistant,
} = require("../models/assistantWellnessCoachModel");
const { normalizeRoleKey } = require("../config/accountRoles");
const config = require("../config");

function dualReadEnabled() {
  return config.accountDualRead !== false;
}

function legacyAdminToAccountShape(admin) {
  if (!admin) return null;
  const memberships = [
    {
      roleKey: "admin",
      roleId: admin.roleId || null,
      permissionOverrides: null,
      status: "active",
      parentAccountId: null,
      grantedAt: admin.createdAt || new Date().toISOString(),
    },
  ];
  return {
    ...admin,
    memberships,
    roleKeys: ["admin"],
    isSuperAdmin: Boolean(admin.isSuperAdmin),
    defaultRoleKey: "admin",
    sourceLegacyType: "admin",
    _legacyTable: "Admin",
  };
}

function legacyCoachToAccountShape(coach) {
  if (!coach) return null;
  const memberships = [
    {
      roleKey: "wellness_coach",
      roleId: coach.roleId || null,
      permissionOverrides: coach.permissionOverrides || null,
      status: "active",
      parentAccountId: null,
      grantedAt: coach.createdAt || new Date().toISOString(),
    },
  ];
  return {
    ...coach,
    memberships,
    roleKeys: ["wellness_coach"],
    isSuperAdmin: false,
    defaultRoleKey: "wellness_coach",
    sourceLegacyType: "wellness_coach",
    _legacyTable: "WellnessCoach",
  };
}

function legacyAssistantToAccountShape(assistant) {
  if (!assistant) return null;
  const parentAccountId = assistant.wellnessCoachId || null;
  const memberships = [
    {
      roleKey: "assistant_wellness_coach",
      roleId: null,
      permissionOverrides: null,
      status: "active",
      parentAccountId,
      grantedAt: assistant.createdAt || new Date().toISOString(),
    },
  ];
  return {
    ...assistant,
    parentAccountId,
    memberships,
    roleKeys: ["assistant_wellness_coach"],
    isSuperAdmin: false,
    defaultRoleKey: "assistant_wellness_coach",
    sourceLegacyType: "assistant_wellness_coach",
    wellnessCoachId: parentAccountId,
    _legacyTable: "AssistantWellnessCoach",
  };
}

async function resolveAccountById(id) {
  if (!id) return null;

  if (dualReadEnabled()) {
    const account = await getAccountById(id);
    if (account && String(account.status || "").toLowerCase() !== "deleted") return account;
  }

  const admin = await getAdminById(id);
  if (admin && String(admin.status || "").toLowerCase() !== "deleted") {
    return legacyAdminToAccountShape(admin);
  }

  const coach = await getWellnessCoachRecordById(id);
  if (coach && String(coach.status || "").toLowerCase() !== "deleted") {
    return legacyCoachToAccountShape(coach);
  }

  const assistant = await getAssistantWellnessCoachRecordById(id);
  if (assistant && String(assistant.status || "").toLowerCase() !== "deleted") {
    return legacyAssistantToAccountShape(assistant);
  }

  return null;
}

async function resolveAccountByEmail(email) {
  if (!email) return null;

  if (dualReadEnabled()) {
    const account = await getAccountByEmail(email);
    if (account && String(account.status || "").toLowerCase() !== "deleted") return account;
  }

  const admin = await getAdminByEmail(email);
  if (admin && String(admin.status || "").toLowerCase() !== "deleted") {
    return legacyAdminToAccountShape(admin);
  }

  const coach = await getWellnessCoachByEmail(email);
  if (coach && String(coach.status || "").toLowerCase() !== "deleted") {
    return legacyCoachToAccountShape(coach);
  }

  const assistant = await getAssistantByEmail(email);
  if (assistant && String(assistant.status || "").toLowerCase() !== "deleted") {
    return legacyAssistantToAccountShape(assistant);
  }

  return null;
}

/**
 * Resolve a staff actor for a specific coarse role (legacy getters).
 * Returns Account-shaped doc when found.
 */
async function resolveStaffByIdForRole(id, roleKey) {
  const key = normalizeRoleKey(roleKey);
  if (!id || !key) return null;

  if (dualReadEnabled()) {
    const account = await getAccountById(id);
    if (
      account &&
      String(account.status || "").toLowerCase() !== "deleted" &&
      hasActiveMembership(account, key)
    ) {
      return account;
    }
  }

  if (key === "admin") {
    const admin = await getAdminById(id);
    if (!admin || String(admin.status || "").toLowerCase() === "deleted") return null;
    return legacyAdminToAccountShape(admin);
  }
  if (key === "wellness_coach") {
    const coach = await getWellnessCoachRecordById(id);
    if (!coach || String(coach.status || "").toLowerCase() === "deleted") return null;
    return legacyCoachToAccountShape(coach);
  }
  if (key === "assistant_wellness_coach") {
    const assistant = await getAssistantWellnessCoachRecordById(id);
    if (!assistant || String(assistant.status || "").toLowerCase() === "deleted") return null;
    return legacyAssistantToAccountShape(assistant);
  }

  // trainee / support only exist on Account
  if (dualReadEnabled()) {
    const account = await getAccountById(id);
    if (
      account &&
      String(account.status || "").toLowerCase() !== "deleted" &&
      hasActiveMembership(account, key)
    ) {
      return account;
    }
  }
  return null;
}

/** Compat: expose coach-like fields (roleId, permissionOverrides, wellnessCoachId). */
function asLegacyCoachView(account) {
  if (!account) return null;
  const membership = getMembership(account, "wellness_coach") || account.memberships?.[0];
  return {
    ...account,
    roleId: membership?.roleId || null,
    permissionOverrides: membership?.permissionOverrides || null,
  };
}

function asLegacyAssistantView(account) {
  if (!account) return null;
  const membership = getMembership(account, "assistant_wellness_coach");
  const parentAccountId = membership?.parentAccountId || account.parentAccountId || null;
  return {
    ...account,
    wellnessCoachId: parentAccountId,
    parentAccountId,
  };
}

function asLegacyAdminView(account) {
  if (!account) return null;
  const membership = getMembership(account, "admin");
  return {
    ...account,
    roleId: membership?.roleId || null,
    isSuperAdmin: Boolean(account.isSuperAdmin),
  };
}

async function getPublicStaffById(id, roleHint = null) {
  const account = roleHint
    ? await resolveStaffByIdForRole(id, roleHint)
    : await resolveAccountById(id);
  if (!account) return null;
  if (account._legacyTable === "Admin") return toPublicAdmin(account);
  if (account._legacyTable === "WellnessCoach") return toPublicWellnessCoach(account);
  if (account._legacyTable === "AssistantWellnessCoach") return toPublicAssistant(account);
  return toPublicAccount(account);
}

// Re-export thin wrappers used by notification / assignment code during dual-read
async function getWellnessCoachByIdResolved(id) {
  const account = await resolveStaffByIdForRole(id, "wellness_coach");
  return account ? asLegacyCoachView(account) : null;
}

async function getAssistantWellnessCoachByIdResolved(id) {
  const account = await resolveStaffByIdForRole(id, "assistant_wellness_coach");
  return account ? asLegacyAssistantView(account) : null;
}

async function getAdminByIdResolved(id) {
  const account = await resolveStaffByIdForRole(id, "admin");
  return account ? asLegacyAdminView(account) : null;
}

module.exports = {
  dualReadEnabled,
  legacyAdminToAccountShape,
  legacyCoachToAccountShape,
  legacyAssistantToAccountShape,
  resolveAccountById,
  resolveAccountByEmail,
  resolveStaffByIdForRole,
  asLegacyCoachView,
  asLegacyAssistantView,
  asLegacyAdminView,
  getPublicStaffById,
  getWellnessCoachByIdResolved,
  getAssistantWellnessCoachByIdResolved,
  getAdminByIdResolved,
};
