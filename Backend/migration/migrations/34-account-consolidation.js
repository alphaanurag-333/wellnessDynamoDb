/**
 * Migration 34: Consolidate Admin / WellnessCoach / AssistantWellnessCoach
 * into the unified Account table (memberships + roleKeys).
 *
 * Does NOT delete legacy tables.
 *
 * Usage (from Backend/):
 *   node migration/migrateAll.js --only=34-account-consolidation
 *   node migration/migrateAll.js --only=34-account-consolidation --dry-run
 *   node migration/migrateAll.js --only=34-account-consolidation --force-merge-email
 */
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { getTableDefinition } = require("../lib/tableSchemas");
const { createAllTables, scanTable, tableExists } = require("../lib/helpers");
const {
  createAccount,
  updateAccount,
  getAccountById,
  getAccountByEmail,
  normalizeMembership,
  syncDerivedFields,
} = require("../../models/accountModel");
const { normalizeEmail } = require("../../models/userModel");

const ACCOUNT_TABLE = "Account";
const BACKUP_DIR = path.join(__dirname, "..", "backup");

function isDryRun() {
  return process.argv.includes("--dry-run");
}

function isForceMergeEmail() {
  return process.argv.includes("--force-merge-email");
}

function stampForFile() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function ensureAccountTable() {
  if (await tableExists(ACCOUNT_TABLE)) {
    console.log(`  [${ACCOUNT_TABLE}] already exists — skip create`);
    return false;
  }

  const definition = getTableDefinition(ACCOUNT_TABLE);
  if (!definition) {
    throw new Error(`Missing table definition for ${ACCOUNT_TABLE}`);
  }

  await createAllTables([definition]);
  return true;
}

function membershipStatusFromAccountStatus(status) {
  const s = String(status || "active").toLowerCase().trim();
  return s === "inactive" ? "inactive" : "active";
}

function legacyTypeForRoleKey(roleKey) {
  if (roleKey === "admin") return "admin";
  if (roleKey === "wellness_coach") return "wellness_coach";
  return "assistant_wellness_coach";
}

function pushLegacySource(account, source) {
  const list = Array.isArray(account.legacySources) ? [...account.legacySources] : [];
  const key = `${source.type}:${source.id}`;
  if (!list.some((s) => `${s?.type}:${s?.id}` === key)) {
    list.push(source);
  }
  return list;
}

function pickMergeFields(payload) {
  const out = {};
  for (const key of [
    "name",
    "phone",
    "phoneCountryCode",
    "profileImage",
    "bio",
    "specializationId",
    "country",
    "state",
    "city",
    "fcmId",
    "status",
    "approvalStatus",
    "webVisible",
    "appVisible",
    "referralCode",
    "designation",
    "isSuperAdmin",
    "password",
    "defaultRoleKey",
    "sourceLegacyType",
    "parentAccountId",
  ]) {
    if (payload[key] !== undefined) out[key] = payload[key];
  }
  return out;
}

function buildAdminPayload(admin, { id } = {}) {
  const grantedAt = admin.createdAt || new Date().toISOString();
  return {
    id: id || admin.id,
    name: admin.name,
    email: admin.email,
    password: admin.password != null ? admin.password : null,
    phone: admin.phone || null,
    profileImage: admin.profileImage || null,
    status: admin.status || "active",
    isSuperAdmin: Boolean(admin.isSuperAdmin),
    memberships: [
      normalizeMembership({
        roleKey: "admin",
        roleId: admin.roleId || null,
        permissionOverrides: null,
        status: membershipStatusFromAccountStatus(admin.status),
        parentAccountId: null,
        grantedAt,
      }),
    ],
    defaultRoleKey: "admin",
    sourceLegacyType: "admin",
    legacySources: [{ type: "admin", id: admin.id }],
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt || admin.createdAt,
  };
}

function buildCoachPayload(coach, { id } = {}) {
  const grantedAt = coach.createdAt || new Date().toISOString();
  return {
    id: id || coach.id,
    name: coach.name,
    email: coach.email,
    password: coach.password != null ? coach.password : null,
    phoneCountryCode: coach.phoneCountryCode,
    phone: coach.phone || null,
    profileImage: coach.profileImage || null,
    bio: coach.bio || null,
    specializationId: coach.specializationId || null,
    country: coach.country || null,
    state: coach.state || null,
    city: coach.city || null,
    fcmId: coach.fcmId || null,
    status: coach.status || "active",
    approvalStatus: coach.approvalStatus || "approved",
    webVisible: coach.webVisible,
    appVisible: coach.appVisible,
    referralCode: coach.referralCode || null,
    isSuperAdmin: false,
    memberships: [
      normalizeMembership({
        roleKey: "wellness_coach",
        roleId: coach.roleId || null,
        permissionOverrides: coach.permissionOverrides || null,
        status: membershipStatusFromAccountStatus(coach.status),
        parentAccountId: null,
        grantedAt,
      }),
    ],
    defaultRoleKey: "wellness_coach",
    sourceLegacyType: "wellness_coach",
    legacySources: [{ type: "wellness_coach", id: coach.id }],
    createdAt: coach.createdAt,
    updatedAt: coach.updatedAt || coach.createdAt,
  };
}

function buildAssistantPayload(assistant, { id, parentAccountId } = {}) {
  const grantedAt = assistant.createdAt || new Date().toISOString();
  const parentId = parentAccountId || assistant.wellnessCoachId || null;
  return {
    id: id || assistant.id,
    name: assistant.name,
    email: assistant.email,
    password: assistant.password != null ? assistant.password : null,
    phoneCountryCode: assistant.phoneCountryCode,
    phone: assistant.phone || null,
    profileImage: assistant.profileImage || null,
    designation: assistant.designation || null,
    fcmId: assistant.fcmId || null,
    status: assistant.status || "active",
    webVisible: assistant.webVisible,
    appVisible: assistant.appVisible,
    referralCode: assistant.referralCode || null,
    parentAccountId: parentId,
    isSuperAdmin: false,
    memberships: [
      normalizeMembership({
        roleKey: "assistant_wellness_coach",
        roleId: assistant.roleId || null,
        permissionOverrides: assistant.permissionOverrides || null,
        status: membershipStatusFromAccountStatus(assistant.status),
        parentAccountId: parentId,
        grantedAt,
      }),
    ],
    defaultRoleKey: "assistant_wellness_coach",
    sourceLegacyType: "assistant_wellness_coach",
    legacySources: [{ type: "assistant_wellness_coach", id: assistant.id }],
    createdAt: assistant.createdAt,
    updatedAt: assistant.updatedAt || assistant.createdAt,
  };
}

/**
 * Merge membership + selected profile fields onto an existing Account.
 * Preserves the first source's password when the target already has one.
 */
async function mergeOntoAccount(
  targetId,
  { dryRun, membership, fieldUpdates = {}, legacySource, preservePassword = true }
) {
  const existing = dryRun
    ? { id: targetId, memberships: [], password: null, legacySources: [] }
    : await getAccountById(targetId);

  if (!existing) {
    throw new Error(`merge target Account not found: ${targetId}`);
  }

  const nextMembership = normalizeMembership(membership);
  const memberships = Array.isArray(existing.memberships) ? [...existing.memberships] : [];
  const idx = memberships.findIndex((m) => m?.roleKey === nextMembership.roleKey);
  if (idx >= 0) {
    memberships[idx] = {
      ...memberships[idx],
      ...nextMembership,
      grantedAt: memberships[idx].grantedAt || nextMembership.grantedAt,
    };
  } else {
    memberships.push(nextMembership);
  }

  const updates = {
    ...fieldUpdates,
    memberships,
    legacySources: pushLegacySource(existing, legacySource),
  };

  if (preservePassword && existing.password) {
    delete updates.password;
  }
  if (existing.sourceLegacyType) {
    delete updates.sourceLegacyType;
  }

  if (dryRun) {
    return syncDerivedFields({ ...existing, ...updates });
  }

  return updateAccount(targetId, updates);
}

async function seedMapsFromDb(id, email, { dryRun, claimedIds, emailMap }) {
  if (dryRun) return;
  if (id) {
    const byId = await getAccountById(id);
    if (byId) {
      claimedIds.add(byId.id);
      if (byId.email) emailMap.set(normalizeEmail(byId.email), byId.id);
    }
  }
  if (email) {
    const byEmail = await getAccountByEmail(email);
    if (byEmail) {
      claimedIds.add(byEmail.id);
      emailMap.set(email, byEmail.id);
    }
  }
}

async function createFreshAccount(payload, { dryRun, claimedIds, emailMap, stats }) {
  const email = normalizeEmail(payload.email);
  if (dryRun) {
    claimedIds.add(payload.id);
    if (email) emailMap.set(email, payload.id);
    stats.created += 1;
    return payload.id;
  }

  try {
    await createAccount(payload);
    claimedIds.add(payload.id);
    if (email) emailMap.set(email, payload.id);
    stats.created += 1;
    return payload.id;
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      await mergeOntoAccount(payload.id, {
        dryRun: false,
        membership: payload.memberships[0],
        fieldUpdates: pickMergeFields(payload),
        legacySource: payload.legacySources?.[0],
      });
      claimedIds.add(payload.id);
      if (email) emailMap.set(email, payload.id);
      stats.mergedExistingId += 1;
      return payload.id;
    }
    throw err;
  }
}

/**
 * Resolve where a legacy staff row should land in Account.
 * Returns the Account id written/merged onto, or null if skipped.
 */
async function resolveTargetForLegacyRow(
  row,
  {
    roleKey,
    dryRun,
    forceMergeEmail,
    claimedIds,
    emailMap,
    idRemap,
    remappings,
    emailMerges,
    stats,
    buildPayload,
  }
) {
  const email = normalizeEmail(row.email);
  if (!email) {
    stats.skippedMissingEmail += 1;
    console.warn(`  skip ${roleKey} ${row.id}: missing email`);
    return null;
  }

  await seedMapsFromDb(row.id, email, { dryRun, claimedIds, emailMap });

  const emailTargetId = emailMap.get(email) || null;
  const idClaimed = claimedIds.has(row.id);
  const legacySource = { type: legacyTypeForRoleKey(roleKey), id: row.id };

  // Same email already owns an Account (possibly different id) → merge membership.
  if (emailTargetId && emailTargetId !== row.id) {
    const payload = buildPayload(row, { id: emailTargetId });
    await mergeOntoAccount(emailTargetId, {
      dryRun,
      membership: payload.memberships[0],
      fieldUpdates: pickMergeFields(payload),
      legacySource,
    });
    idRemap.set(row.id, emailTargetId);
    emailMerges.push({
      legacyId: row.id,
      legacyType: legacySource.type,
      email,
      targetAccountId: emailTargetId,
      reason: "email-match",
    });
    stats.emailMerges += 1;
    return emailTargetId;
  }

  // Id already claimed by another row.
  if (idClaimed) {
    const claimedEmail =
      [...emailMap.entries()].find(([, accountId]) => accountId === row.id)?.[0] || null;

    if (claimedEmail && claimedEmail === email) {
      const payload = buildPayload(row, { id: row.id });
      await mergeOntoAccount(row.id, {
        dryRun,
        membership: payload.memberships[0],
        fieldUpdates: pickMergeFields(payload),
        legacySource,
      });
      idRemap.set(row.id, row.id);
      stats.mergedExistingId += 1;
      return row.id;
    }

    if (forceMergeEmail) {
      const payload = buildPayload(row, { id: row.id });
      await mergeOntoAccount(row.id, {
        dryRun,
        membership: payload.memberships[0],
        fieldUpdates: pickMergeFields(payload),
        legacySource,
      });
      idRemap.set(row.id, row.id);
      emailMerges.push({
        legacyId: row.id,
        legacyType: legacySource.type,
        email,
        claimedEmail,
        targetAccountId: row.id,
        reason: "force-merge-email-id-collision",
      });
      stats.forcedEmailMerges += 1;
      return row.id;
    }

    // Different emails collide on id → mint a new Account id and record remapping.
    const newId = uuidv4();
    const payload = buildPayload(row, { id: newId });
    await createFreshAccount(payload, { dryRun, claimedIds, emailMap, stats });
    idRemap.set(row.id, newId);
    remappings.push({
      legacyId: row.id,
      newAccountId: newId,
      legacyType: legacySource.type,
      legacyEmail: email,
      claimedEmail,
      reason: "id-collision-different-email",
    });
    stats.idRemapped += 1;
    return newId;
  }

  // Existing Account with this id (seeded) or brand-new create.
  if (emailTargetId === row.id || claimedIds.has(row.id)) {
    const payload = buildPayload(row, { id: row.id });
    await mergeOntoAccount(row.id, {
      dryRun,
      membership: payload.memberships[0],
      fieldUpdates: pickMergeFields(payload),
      legacySource,
    });
    claimedIds.add(row.id);
    emailMap.set(email, row.id);
    idRemap.set(row.id, row.id);
    stats.mergedExistingId += 1;
    return row.id;
  }

  const payload = buildPayload(row, { id: row.id });
  const accountId = await createFreshAccount(payload, { dryRun, claimedIds, emailMap, stats });
  idRemap.set(row.id, accountId);
  return accountId;
}

async function migrateAccountConsolidation() {
  const dryRun = isDryRun();
  const forceMergeEmail = isForceMergeEmail();

  console.log("Account consolidation migration...");
  if (dryRun) console.log("  mode: DRY-RUN (no writes)");
  if (forceMergeEmail) console.log("  mode: --force-merge-email enabled");

  const tableCreated = await ensureAccountTable();

  const claimedIds = new Set();
  const emailMap = new Map();
  const idRemap = new Map();
  const remappings = [];
  const emailMerges = [];
  const orphanAssistants = [];

  const stats = {
    created: 0,
    mergedExistingId: 0,
    emailMerges: 0,
    forcedEmailMerges: 0,
    idRemapped: 0,
    skippedMissingEmail: 0,
    admins: 0,
    coaches: 0,
    assistants: 0,
    orphans: 0,
  };

  const roleCounts = {
    admin: 0,
    wellness_coach: 0,
    assistant_wellness_coach: 0,
  };

  const sharedCtx = {
    dryRun,
    forceMergeEmail,
    claimedIds,
    emailMap,
    idRemap,
    remappings,
    emailMerges,
    stats,
  };

  // --- Admins first (claim ids) ---
  let admins = [];
  if (await tableExists("Admin")) {
    admins = await scanTable("Admin");
    console.log(`  [Admin] scanned ${admins.length} row(s)`);
  } else {
    console.log("  [Admin] table does not exist — skip");
  }

  for (const admin of admins) {
    const targetId = await resolveTargetForLegacyRow(admin, {
      ...sharedCtx,
      roleKey: "admin",
      buildPayload: buildAdminPayload,
    });
    if (targetId) {
      stats.admins += 1;
      roleCounts.admin += 1;
    }
  }

  // --- Wellness coaches ---
  let coaches = [];
  if (await tableExists("WellnessCoach")) {
    coaches = await scanTable("WellnessCoach");
    console.log(`  [WellnessCoach] scanned ${coaches.length} row(s)`);
  } else {
    console.log("  [WellnessCoach] table does not exist — skip");
  }

  for (const coach of coaches) {
    const targetId = await resolveTargetForLegacyRow(coach, {
      ...sharedCtx,
      roleKey: "wellness_coach",
      buildPayload: buildCoachPayload,
    });
    if (targetId) {
      stats.coaches += 1;
      roleCounts.wellness_coach += 1;
    }
  }

  // --- Assistants ---
  let assistants = [];
  if (await tableExists("AssistantWellnessCoach")) {
    assistants = await scanTable("AssistantWellnessCoach");
    console.log(`  [AssistantWellnessCoach] scanned ${assistants.length} row(s)`);
  } else {
    console.log("  [AssistantWellnessCoach] table does not exist — skip");
  }

  for (const assistant of assistants) {
    const legacyParent = assistant.wellnessCoachId || null;
    const resolvedParent =
      (legacyParent && idRemap.get(legacyParent)) ||
      (legacyParent && claimedIds.has(legacyParent) ? legacyParent : null) ||
      null;

    if (!resolvedParent) {
      orphanAssistants.push({
        legacyId: assistant.id,
        email: normalizeEmail(assistant.email),
        wellnessCoachId: legacyParent,
      });
      stats.orphans += 1;
    }

    const targetId = await resolveTargetForLegacyRow(assistant, {
      ...sharedCtx,
      roleKey: "assistant_wellness_coach",
      buildPayload: (row, opts) =>
        buildAssistantPayload(row, {
          ...opts,
          parentAccountId: resolvedParent || row.wellnessCoachId || null,
        }),
    });
    if (targetId) {
      stats.assistants += 1;
      roleCounts.assistant_wellness_coach += 1;
    }
  }

  const report = {
    migratedAt: new Date().toISOString(),
    dryRun,
    forceMergeEmail,
    tableCreated,
    stats,
    roleCounts,
    emailMerges,
    idRemappings: remappings,
    orphanAssistants,
    note: "Legacy Admin / WellnessCoach / AssistantWellnessCoach tables were not deleted.",
  };

  console.log("\nReconciliation report:");
  console.log(`  by roleKey: ${JSON.stringify(roleCounts)}`);
  console.log(`  created: ${stats.created}`);
  console.log(`  merged existing id: ${stats.mergedExistingId}`);
  console.log(`  email merges: ${stats.emailMerges}`);
  console.log(`  forced email merges: ${stats.forcedEmailMerges}`);
  console.log(`  id collisions remapped: ${stats.idRemapped}`);
  console.log(`  orphan assistants: ${stats.orphans}`);
  console.log(`  skipped missing email: ${stats.skippedMissingEmail}`);

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const reportName = `account-backfill-report-${stampForFile()}.json`;
  const reportPath = path.join(BACKUP_DIR, reportName);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`  report written to migration/backup/${reportName}`);

  return report;
}

module.exports = {
  id: "34-account-consolidation",
  migrateAccountConsolidation,
};
