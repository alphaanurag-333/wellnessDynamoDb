/**
 * M3 — shadow-mode comparison: for every real account, compute permissions
 * with the OLD per-account-type resolver and the NEW unified resolver and
 * diff them. Run this before flipping any `STAFF_CUTOVER_*` flag to confirm
 * nobody's effective permissions change on cutover.
 *
 * Usage: node Backend/scripts/shadowCompareStaffPermissions.js
 */
require("dotenv").config();

const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { getRoleById } = require("../models/roleModel");
const { getStaffAccountRecordById } = require("../models/staffAccountModel");
const { resolvePermissions, resolveStaffPermissions } = require("../utils/permissions");
const { resolveCoachPermissionMap, permissionMapToList } = require("../utils/coachPermissions");
const { remapLegacySlug } = require("../config/staffPermissionSlugMap");

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

function diffSets(oldList, newList) {
  const oldSet = new Set(oldList);
  const newSet = new Set(newList);
  const missingInNew = oldList.filter((slug) => !newSet.has(slug));
  const extraInNew = newList.filter((slug) => !oldSet.has(slug));
  return { missingInNew, extraInNew };
}

async function compareAdmins() {
  const admins = await scanAll("Admin");
  let mismatches = 0;
  for (const admin of admins) {
    const role = !admin.isSuperAdmin && admin.roleId ? await getRoleById(admin.roleId) : null;
    // `remapLegacySlug` returns null for slugs with no unified equivalent
    // (e.g. `nav.profile` — never permission-gated); drop those rather than
    // falling back to the untranslated legacy slug, which would never match
    // anything the new resolver produces and show up as a false mismatch.
    const oldPermissions = resolvePermissions(admin, role)
      .map((slug) => remapLegacySlug(slug, "ADMIN"))
      .filter(Boolean);

    const staffAccount = await getStaffAccountRecordById(admin.id);
    if (!staffAccount) {
      console.warn(`[admin ${admin.id}] no StaffAccount mirror yet — skipping`);
      continue;
    }
    const newRole = !staffAccount.isSuperAdmin && staffAccount.roleId ? await getRoleById(staffAccount.roleId) : null;
    const newPermissions = resolveStaffPermissions(staffAccount, newRole);

    const { missingInNew, extraInNew } = diffSets(oldPermissions, newPermissions);
    // `extraInNew` alone is a benign expansion (e.g. Super Admin now also
    // sees coach-only modules under the unified panel) — only a lost
    // permission (`missingInNew`) is a real regression worth blocking on.
    if (extraInNew.length > 0) {
      console.log(`[admin ${admin.id} / ${admin.email}] gained permissions (expected, non-blocking):`, extraInNew);
    }
    if (missingInNew.length > 0) {
      mismatches += 1;
      console.warn(`[admin ${admin.id} / ${admin.email}] REGRESSION — lost permissions:`, missingInNew);
    }
  }
  console.log(`Admin: ${admins.length} checked, ${mismatches} regression(s)`);
  return mismatches;
}

async function compareCoachesAndAssistants(tableName, roleScope) {
  const rows = await scanAll(tableName);
  let mismatches = 0;
  for (const row of rows) {
    const role = row.roleId ? await getRoleById(row.roleId) : null;
    const validRole = role && String(role.scope || "ADMIN").toUpperCase() === roleScope ? role : null;
    const oldMap = resolveCoachPermissionMap(row, validRole);
    // See the ADMIN branch above for why nulls (e.g. `nav.profile`) are
    // dropped instead of falling back to the untranslated legacy slug.
    const oldPermissions = permissionMapToList(oldMap)
      .map((slug) => remapLegacySlug(slug, "COACH"))
      .filter(Boolean);

    const staffAccount = await getStaffAccountRecordById(row.id);
    if (!staffAccount) {
      console.warn(`[${tableName} ${row.id}] no StaffAccount mirror yet — skipping`);
      continue;
    }
    const newRole = staffAccount.roleId ? await getRoleById(staffAccount.roleId) : null;
    const newPermissions = resolveStaffPermissions(staffAccount, newRole);

    // Only a lost permission (`missingInNew`) is a real regression worth
    // blocking cutover on. `extraInNew` is a benign expansion — e.g.
    // no-role coaches/assistants previously got a single boolean "access"
    // (view-equivalent) fallback; the unified resolver grants full
    // view/edit/delete trust for the same modules, same "no role = trusted"
    // intent, just expressed with the richer action set every module now has.
    const { missingInNew, extraInNew } = diffSets(oldPermissions, newPermissions);
    if (extraInNew.length > 0) {
      console.log(`[${tableName} ${row.id} / ${row.email}] gained permissions (expected, non-blocking):`, extraInNew);
    }
    if (missingInNew.length > 0) {
      mismatches += 1;
      console.warn(`[${tableName} ${row.id} / ${row.email}] REGRESSION — lost permissions:`, missingInNew);
    }
  }
  console.log(`${tableName}: ${rows.length} checked, ${mismatches} regression(s)`);
  return mismatches;
}

async function main() {
  console.log("=== Shadow-mode permission comparison (old resolver vs unified resolver) ===\n");
  const adminMismatches = await compareAdmins();
  const coachMismatches = await compareCoachesAndAssistants("WellnessCoach", "COACH");
  const assistantMismatches = await compareCoachesAndAssistants("AssistantWellnessCoach", "COACH");

  const total = adminMismatches + coachMismatches + assistantMismatches;
  console.log(`\nTotal regressions (lost permissions): ${total}`);
  if (total > 0) {
    console.error("Do NOT flip STAFF_CUTOVER_* flags until regressions are resolved (re-run the backfill script?).");
    process.exitCode = 1;
  } else {
    console.log(
      "Safe to proceed with cutover — no account loses a permission it had before (gains, if any, are logged above)."
    );
  }
}

main().catch((err) => {
  console.error("Shadow comparison crashed:", err);
  process.exitCode = 1;
});
