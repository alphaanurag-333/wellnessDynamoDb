/**
 * Dual-write: keep Account in sync when legacy staff tables are written.
 * Enabled via config.accountDualWrite (ACCOUNT_DUAL_WRITE=true).
 *
 * Errors are swallowed/logged so legacy create/update never fails solely due
 * to Account sync.
 */
const {
  createAccount,
  getAccountById,
  getAccountByEmail,
  updateAccount,
  addMembership,
  removeMembership,
} = require("../models/accountModel");
const { normalizeEmail } = require("../models/userModel");

function membershipStatusFromAccountStatus(status) {
  const s = String(status || "active").toLowerCase().trim();
  return s === "inactive" ? "inactive" : "active";
}

function pushLegacySource(account, source) {
  const list = Array.isArray(account?.legacySources) ? [...account.legacySources] : [];
  const key = `${source.type}:${source.id}`;
  if (!list.some((row) => `${row?.type}:${row?.id}` === key)) {
    list.push(source);
  }
  return list;
}

async function findExistingAccount(doc) {
  if (!doc) return null;
  if (doc.id) {
    const byId = await getAccountById(doc.id);
    if (byId) return byId;
  }
  const email = normalizeEmail(doc.email);
  if (email) {
    return getAccountByEmail(email);
  }
  return null;
}

/**
 * Upsert Account from a legacy Admin document.
 */
async function syncAdminToAccount(adminDoc) {
  try {
    if (!adminDoc?.id) return null;

    const membership = {
      roleKey: "admin",
      roleId: adminDoc.roleId || null,
      permissionOverrides: null,
      status: membershipStatusFromAccountStatus(adminDoc.status),
      parentAccountId: null,
      grantedAt: adminDoc.createdAt || new Date().toISOString(),
    };

    const existing = await findExistingAccount(adminDoc);
    if (!existing) {
      return await createAccount({
        id: adminDoc.id,
        name: adminDoc.name,
        email: adminDoc.email,
        password: adminDoc.password != null ? adminDoc.password : null,
        phone: adminDoc.phone || null,
        profileImage: adminDoc.profileImage || null,
        status: adminDoc.status || "active",
        isSuperAdmin: Boolean(adminDoc.isSuperAdmin),
        memberships: [membership],
        defaultRoleKey: "admin",
        sourceLegacyType: "admin",
        legacySources: [{ type: "admin", id: adminDoc.id }],
        createdAt: adminDoc.createdAt,
        updatedAt: adminDoc.updatedAt || adminDoc.createdAt,
      });
    }

    await addMembership(existing.id, membership);

    const updates = {
      name: adminDoc.name,
      phone: adminDoc.phone || null,
      profileImage: adminDoc.profileImage || null,
      status: adminDoc.status || existing.status,
      isSuperAdmin: Boolean(adminDoc.isSuperAdmin),
      legacySources: pushLegacySource(existing, { type: "admin", id: adminDoc.id }),
    };
    if (adminDoc.email) updates.email = adminDoc.email;
    // Only set password when Account has none (preserve first source).
    if (!existing.password && adminDoc.password != null) {
      updates.password = adminDoc.password;
    }

    return await updateAccount(existing.id, updates);
  } catch (err) {
    console.error("[accountDualWrite] syncAdminToAccount:", err.message);
    return null;
  }
}

/**
 * Upsert Account from a legacy WellnessCoach document.
 */
async function syncWellnessCoachToAccount(coachDoc) {
  try {
    if (!coachDoc?.id) return null;

    const membership = {
      roleKey: "wellness_coach",
      roleId: coachDoc.roleId || null,
      permissionOverrides: coachDoc.permissionOverrides || null,
      status: membershipStatusFromAccountStatus(coachDoc.status),
      parentAccountId: null,
      grantedAt: coachDoc.createdAt || new Date().toISOString(),
    };

    const existing = await findExistingAccount(coachDoc);
    if (!existing) {
      return await createAccount({
        id: coachDoc.id,
        name: coachDoc.name,
        email: coachDoc.email,
        password: coachDoc.password != null ? coachDoc.password : null,
        phoneCountryCode: coachDoc.phoneCountryCode,
        phone: coachDoc.phone || null,
        profileImage: coachDoc.profileImage || null,
        bio: coachDoc.bio || null,
        specializationId: coachDoc.specializationId || null,
        country: coachDoc.country || null,
        state: coachDoc.state || null,
        city: coachDoc.city || null,
        fcmId: coachDoc.fcmId || null,
        status: coachDoc.status || "active",
        approvalStatus: coachDoc.approvalStatus || "approved",
        webVisible: coachDoc.webVisible,
        appVisible: coachDoc.appVisible,
        referralCode: coachDoc.referralCode || null,
        isSuperAdmin: false,
        memberships: [membership],
        defaultRoleKey: "wellness_coach",
        sourceLegacyType: "wellness_coach",
        legacySources: [{ type: "wellness_coach", id: coachDoc.id }],
        createdAt: coachDoc.createdAt,
        updatedAt: coachDoc.updatedAt || coachDoc.createdAt,
      });
    }

    await addMembership(existing.id, membership);

    const updates = {
      name: coachDoc.name,
      phoneCountryCode: coachDoc.phoneCountryCode,
      phone: coachDoc.phone || null,
      profileImage: coachDoc.profileImage || null,
      bio: coachDoc.bio || null,
      specializationId: coachDoc.specializationId || null,
      country: coachDoc.country || null,
      state: coachDoc.state || null,
      city: coachDoc.city || null,
      fcmId: coachDoc.fcmId || null,
      status: coachDoc.status || existing.status,
      approvalStatus: coachDoc.approvalStatus || existing.approvalStatus,
      webVisible: coachDoc.webVisible,
      appVisible: coachDoc.appVisible,
      referralCode: coachDoc.referralCode || null,
      legacySources: pushLegacySource(existing, { type: "wellness_coach", id: coachDoc.id }),
    };
    if (coachDoc.email) updates.email = coachDoc.email;
    if (!existing.password && coachDoc.password != null) {
      updates.password = coachDoc.password;
    }

    return await updateAccount(existing.id, updates);
  } catch (err) {
    console.error("[accountDualWrite] syncWellnessCoachToAccount:", err.message);
    return null;
  }
}

/**
 * Upsert Account from a legacy AssistantWellnessCoach document.
 */
async function syncAssistantToAccount(assistantDoc) {
  try {
    if (!assistantDoc?.id) return null;

    const parentAccountId = assistantDoc.wellnessCoachId || null;
    const membership = {
      roleKey: "assistant_wellness_coach",
      roleId: assistantDoc.roleId || null,
      permissionOverrides: assistantDoc.permissionOverrides || null,
      status: membershipStatusFromAccountStatus(assistantDoc.status),
      parentAccountId,
      grantedAt: assistantDoc.createdAt || new Date().toISOString(),
    };

    const existing = await findExistingAccount(assistantDoc);
    if (!existing) {
      return await createAccount({
        id: assistantDoc.id,
        name: assistantDoc.name,
        email: assistantDoc.email,
        password: assistantDoc.password != null ? assistantDoc.password : null,
        phoneCountryCode: assistantDoc.phoneCountryCode,
        phone: assistantDoc.phone || null,
        profileImage: assistantDoc.profileImage || null,
        designation: assistantDoc.designation || null,
        fcmId: assistantDoc.fcmId || null,
        status: assistantDoc.status || "active",
        webVisible: assistantDoc.webVisible,
        appVisible: assistantDoc.appVisible,
        referralCode: assistantDoc.referralCode || null,
        parentAccountId,
        isSuperAdmin: false,
        memberships: [membership],
        defaultRoleKey: "assistant_wellness_coach",
        sourceLegacyType: "assistant_wellness_coach",
        legacySources: [{ type: "assistant_wellness_coach", id: assistantDoc.id }],
        createdAt: assistantDoc.createdAt,
        updatedAt: assistantDoc.updatedAt || assistantDoc.createdAt,
      });
    }

    await addMembership(existing.id, membership);

    const updates = {
      name: assistantDoc.name,
      phoneCountryCode: assistantDoc.phoneCountryCode,
      phone: assistantDoc.phone || null,
      profileImage: assistantDoc.profileImage || null,
      designation: assistantDoc.designation || null,
      fcmId: assistantDoc.fcmId || null,
      status: assistantDoc.status || existing.status,
      webVisible: assistantDoc.webVisible,
      appVisible: assistantDoc.appVisible,
      referralCode: assistantDoc.referralCode || null,
      parentAccountId,
      legacySources: pushLegacySource(existing, {
        type: "assistant_wellness_coach",
        id: assistantDoc.id,
      }),
    };
    if (assistantDoc.email) updates.email = assistantDoc.email;
    if (!existing.password && assistantDoc.password != null) {
      updates.password = assistantDoc.password;
    }

    return await updateAccount(existing.id, updates);
  } catch (err) {
    console.error("[accountDualWrite] syncAssistantToAccount:", err.message);
    return null;
  }
}

/**
 * Soft-deactivate a membership on Account (optional helper for deletes).
 */
async function softRemoveMembership(accountId, roleKey) {
  try {
    if (!accountId || !roleKey) return null;
    return await removeMembership(accountId, roleKey);
  } catch (err) {
    console.error("[accountDualWrite] softRemoveMembership:", err.message);
    return null;
  }
}

module.exports = {
  syncAdminToAccount,
  syncWellnessCoachToAccount,
  syncAssistantToAccount,
  softRemoveMembership,
};
