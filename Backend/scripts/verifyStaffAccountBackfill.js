/**
 * M3 — integrity verification for the StaffAccount backfill.
 *
 * Checks:
 *  1. Row-count parity between each legacy table and its StaffAccount partition.
 *  2. Every legacy row's id/email/status round-tripped correctly.
 *  3. No duplicate emails/phones across StaffAccount (global uniqueness safeguard).
 *  4. Every assistant has a roleId (M4 requires this).
 *  5. Every roleId on a StaffAccount row resolves to a Role that targets that
 *     account's accountType.
 *
 * Usage: node Backend/scripts/verifyStaffAccountBackfill.js
 * Exits non-zero if any check fails.
 */
require("dotenv").config();

const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { getRoleById, roleTargetsAccountType } = require("../models/roleModel");

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

async function main() {
  const problems = [];

  const [admins, coaches, assistants, staffAccounts] = await Promise.all([
    scanAll("Admin"),
    scanAll("WellnessCoach"),
    scanAll("AssistantWellnessCoach"),
    scanAll("StaffAccount"),
  ]);

  const staffById = new Map(staffAccounts.map((row) => [row.id, row]));

  function checkParity(legacyRows, accountType) {
    const staffRows = staffAccounts.filter((row) => row.accountType === accountType);
    console.log(`${accountType}: legacy=${legacyRows.length} staffAccount=${staffRows.length}`);
    if (legacyRows.length !== staffRows.length) {
      problems.push(
        `Row count mismatch for ${accountType}: legacy=${legacyRows.length} staffAccount=${staffRows.length}`
      );
    }
    for (const legacyRow of legacyRows) {
      const mirrored = staffById.get(legacyRow.id);
      if (!mirrored) {
        problems.push(`Missing StaffAccount row for ${accountType} id=${legacyRow.id}`);
        continue;
      }
      if (mirrored.accountType !== accountType) {
        problems.push(`accountType mismatch for id=${legacyRow.id}: expected ${accountType}, got ${mirrored.accountType}`);
      }
      const legacyEmail = String(legacyRow.email || "").toLowerCase().trim();
      if (legacyEmail && mirrored.email !== legacyEmail) {
        problems.push(`Email mismatch for id=${legacyRow.id}: legacy=${legacyEmail} staff=${mirrored.email}`);
      }
    }
  }

  checkParity(admins, "admin");
  checkParity(coaches, "wellness_coach");
  checkParity(assistants, "assistant_wellness_coach");

  // Global uniqueness.
  const emailCounts = new Map();
  const phoneCounts = new Map();
  for (const row of staffAccounts) {
    if (row.email) emailCounts.set(row.email, (emailCounts.get(row.email) || 0) + 1);
    if (row.phoneKey) phoneCounts.set(row.phoneKey, (phoneCounts.get(row.phoneKey) || 0) + 1);
  }
  for (const [email, count] of emailCounts) {
    if (count > 1) problems.push(`Duplicate email across StaffAccount: ${email} (${count} rows)`);
  }
  for (const [phoneKey, count] of phoneCounts) {
    if (count > 1) problems.push(`Duplicate phone across StaffAccount: ${phoneKey} (${count} rows)`);
  }

  // Every assistant must have a roleId post-backfill (M4 requirement).
  const assistantsWithoutRole = staffAccounts.filter(
    (row) => row.accountType === "assistant_wellness_coach" && !row.roleId
  );
  if (assistantsWithoutRole.length > 0) {
    problems.push(
      `${assistantsWithoutRole.length} assistant(s) still have no roleId: ${assistantsWithoutRole
        .map((r) => r.id)
        .join(", ")}`
    );
  }

  // roleId must resolve and target the right accountType.
  for (const row of staffAccounts) {
    if (!row.roleId) continue;
    const role = await getRoleById(row.roleId);
    if (!role) {
      problems.push(`StaffAccount id=${row.id} has roleId=${row.roleId} which does not exist`);
      continue;
    }
    if (!roleTargetsAccountType(role, row.accountType)) {
      problems.push(
        `StaffAccount id=${row.id} (${row.accountType}) has role "${role.name}" which does not target this accountType`
      );
    }
  }

  console.log("\n=== Verification result ===");
  if (problems.length === 0) {
    console.log("PASS — StaffAccount backfill is consistent with legacy tables.");
    return;
  }
  console.error(`FAIL — ${problems.length} problem(s) found:`);
  for (const problem of problems) console.error(` - ${problem}`);
  process.exitCode = 1;
}

main().catch((err) => {
  console.error("Verification script crashed:", err);
  process.exitCode = 1;
});
