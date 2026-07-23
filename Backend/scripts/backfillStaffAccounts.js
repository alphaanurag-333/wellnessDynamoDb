/**
 * M3 — one-off backfill for the Unified Staff RBAC Panel migration.
 *
 * 1. Copies every existing `Admin`, `WellnessCoach` and `AssistantWellnessCoach`
 *    row into `StaffAccount`, preserving `id` exactly (critical — 18 models /
 *    48 controllers reference these ids as foreign keys and are never touched).
 * 2. Assigns assistants a real role for the first time: a default
 *    "Assistant — Full Access" role (all assistant-scoped permissions, so
 *    behavior is unchanged) — but only for assistants that don't already
 *    have a role in `StaffAccount` (never clobbers a role an admin already
 *    assigned post-cutover through the new panel).
 * 3. Remaps every Role row's `permissions` from the legacy admin/coach slugs
 *    onto the unified `staffPermissionCatalog` slugs (idempotent — already-
 *    unified slugs pass through unchanged), and backfills `accountTypes`
 *    from the legacy `scope`.
 *
 * Safe to re-run: every step is idempotent except the default-role
 * assignment, which is skipped once a role has been set (see point 2).
 *
 * Usage: node Backend/scripts/backfillStaffAccounts.js
 */
require("dotenv").config();

const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const {
  mirrorAdmin,
  mirrorWellnessCoach,
  mirrorAssistant,
  getStaffAccountRecordById,
  updateStaffAccount,
} = require("../models/staffAccountModel");
const {
  listRoles,
  updateRole,
  normalizeAccountTypes,
  normalizeScope,
  getRoleBySlug,
  createRole,
} = require("../models/roleModel");
const { remapLegacySlugList } = require("../config/staffPermissionSlugMap");
const {
  ASSISTANT_WELLNESS_COACH,
  permissionsForAccountType,
} = require("../config/staffPermissionCatalog");

async function scanAll(tableName) {
  const items = [];
  let lastKey;
  do {
    const { Items = [], LastEvaluatedKey } = await docClient.send(
      new ScanCommand({ TableName: tableName, ExclusiveStartKey: lastKey })
    );
    items.push(...Items);
    lastKey = LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function backfillAdmins() {
  const admins = await scanAll("Admin");
  for (const admin of admins) {
    await mirrorAdmin(admin);
  }
  console.log(`Admin -> StaffAccount: ${admins.length} rows mirrored`);
  return admins.length;
}

async function backfillWellnessCoaches() {
  const coaches = await scanAll("WellnessCoach");
  for (const coach of coaches) {
    await mirrorWellnessCoach(coach);
  }
  console.log(`WellnessCoach -> StaffAccount: ${coaches.length} rows mirrored`);
  return coaches.length;
}

async function ensureDefaultAssistantRole() {
  const slug = "assistant-full-access";
  const existing = await getRoleBySlug(slug);
  if (existing) return existing;

  const role = await createRole({
    name: "Assistant — Full Access",
    slug,
    permissions: permissionsForAccountType(ASSISTANT_WELLNESS_COACH),
    status: "active",
    accountTypes: [ASSISTANT_WELLNESS_COACH],
  });
  console.log(`Created default role "${role.name}" (${role.id}) for assistants with no prior role`);
  return role;
}

async function backfillAssistants() {
  const assistants = await scanAll("AssistantWellnessCoach");
  const defaultRole = await ensureDefaultAssistantRole();

  let assignedDefaultRole = 0;
  for (const assistant of assistants) {
    await mirrorAssistant(assistant);

    // Re-read post-mirror: `mirrorAssistant` now carries over any pre-existing
    // `roleId` (legacy table has no such column), so this reflects true state.
    const staffRow = await getStaffAccountRecordById(assistant.id);
    if (!staffRow?.roleId) {
      await updateStaffAccount(assistant.id, { roleId: defaultRole.id });
      assignedDefaultRole += 1;
    }
  }
  console.log(`AssistantWellnessCoach -> StaffAccount: ${assistants.length} rows mirrored`);
  console.log(`Assigned default role to ${assignedDefaultRole} assistant(s) with no prior role`);
  return assistants.length;
}

async function remapRolePermissions() {
  let remapped = 0;
  let scanned = 0;

  // Role table is small (tens, not thousands) — one page covers all of them.
  const { roles } = await listRoles({ page: 1, limit: 1000 });
  for (const role of roles) {
    scanned += 1;
    const legacyScope = normalizeScope(role.scope, "ADMIN");
    const remappedPermissions = remapLegacySlugList(role.permissions, legacyScope);
    const accountTypes = normalizeAccountTypes(role.accountTypes, role.scope);

    const changed =
      JSON.stringify([...remappedPermissions].sort()) !== JSON.stringify([...(role.permissions || [])].sort()) ||
      JSON.stringify([...accountTypes].sort()) !== JSON.stringify([...(role.accountTypes || [])].sort());

    if (changed) {
      await updateRole(role.id, { permissions: remappedPermissions, accountTypes });
      remapped += 1;
    }
  }
  console.log(`Role permission remap: ${remapped}/${scanned} role(s) updated to unified slugs`);
  return { scanned, remapped };
}

async function main() {
  console.log("=== M3 Backfill: legacy staff tables -> StaffAccount ===");
  const adminCount = await backfillAdmins();
  const coachCount = await backfillWellnessCoaches();
  const assistantCount = await backfillAssistants();

  console.log("\n=== M3 Backfill: Role.permissions -> unified slugs ===");
  const roleResult = await remapRolePermissions();

  console.log("\n=== Summary ===");
  console.log({ adminCount, coachCount, assistantCount, ...roleResult });
  console.log("Done. Run Backend/scripts/verifyStaffAccountBackfill.js next.");
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exitCode = 1;
});
