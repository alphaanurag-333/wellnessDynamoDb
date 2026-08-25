/**
 * Backfill referral codes for Wellness Coaches and Assistant Wellness Coaches
 * that are missing one (random 8-char format, e.g. 7WDW4JST).
 *
 * Covers Account (source of truth) plus the legacy WellnessCoach /
 * AssistantWellnessCoach mirrors, and repairs missing ReferralCode registry rows.
 * Existing codes are never overwritten.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/backfillStaffReferralCodes.js --dry-run
 *   node --use-system-ca scripts/backfillStaffReferralCodes.js
 */
require("dotenv").config();

const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { tableExists, scanTable } = require("../migration/lib/helpers");
const {
  generateUniqueReferralCode,
  registerReferralCode,
  getReferralCodeRecord,
  normalizeReferralCode,
} = require("../models/referralCodeModel");

const DRY_RUN = process.argv.includes("--dry-run");

const STAFF_ENTITY_TYPES = ["wellness_coach", "assistant_wellness_coach"];
const ENTITY_LABEL = {
  wellness_coach: "WC",
  assistant_wellness_coach: "AWC",
};

/** Which staff role an Account record should get a code for, if any. */
function resolveAccountEntityType(account) {
  const roleKeys = Array.isArray(account?.roleKeys) ? account.roleKeys : [];
  const preferred = String(account?.defaultRoleKey || "").toLowerCase().trim();
  if (STAFF_ENTITY_TYPES.includes(preferred) && roleKeys.includes(preferred)) return preferred;
  return STAFF_ENTITY_TYPES.find((type) => roleKeys.includes(type)) || null;
}

function entryKey(entityType, id) {
  return `${entityType}:${id}`;
}

function upsertTarget(entries, { entityType, id, table, referralCode, ownerCoachId, label }) {
  if (!entityType || !id) return;
  const key = entryKey(entityType, id);
  const entry = entries.get(key) || {
    id,
    entityType,
    label: label || id,
    ownerCoachId: null,
    targets: [],
  };
  if (label && entry.label === entry.id) entry.label = label;
  if (!entry.ownerCoachId && ownerCoachId) entry.ownerCoachId = ownerCoachId;
  entry.targets.push({ table, referralCode: normalizeReferralCode(referralCode) || null });
  entries.set(key, entry);
}

async function collectAccounts(entries) {
  if (!(await tableExists("Account"))) {
    console.log("  [Account] missing — skip");
    return;
  }
  for (const account of await scanTable("Account")) {
    const entityType = resolveAccountEntityType(account);
    if (!entityType) continue;
    upsertTarget(entries, {
      entityType,
      id: account.id,
      table: "Account",
      referralCode: account.referralCode,
      ownerCoachId:
        entityType === "wellness_coach" ? account.id : account.parentAccountId || null,
      label: account.name || account.email,
    });
  }
}

async function collectLegacyMirrors(entries) {
  if (await tableExists("WellnessCoach")) {
    for (const coach of await scanTable("WellnessCoach")) {
      upsertTarget(entries, {
        entityType: "wellness_coach",
        id: coach.id,
        table: "WellnessCoach",
        referralCode: coach.referralCode,
        ownerCoachId: coach.id,
        label: coach.name || coach.email,
      });
    }
  } else {
    console.log("  [WellnessCoach] missing — skip");
  }

  if (await tableExists("AssistantWellnessCoach")) {
    for (const assistant of await scanTable("AssistantWellnessCoach")) {
      upsertTarget(entries, {
        entityType: "assistant_wellness_coach",
        id: assistant.id,
        table: "AssistantWellnessCoach",
        referralCode: assistant.referralCode,
        ownerCoachId: assistant.wellnessCoachId || null,
        label: assistant.name || assistant.email,
      });
    }
  } else {
    console.log("  [AssistantWellnessCoach] missing — skip");
  }
}

async function writeReferralCode(tableName, id, referralCode) {
  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { id },
      UpdateExpression: "SET referralCode = :referralCode, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":referralCode": referralCode,
        ":updatedAt": new Date().toISOString(),
      },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function run() {
  console.log(DRY_RUN ? "Backfill staff referral codes (dry run)" : "Backfill staff referral codes");

  const entries = new Map();
  await collectAccounts(entries);
  await collectLegacyMirrors(entries);

  const registryExists = await tableExists("ReferralCode");
  if (!registryExists) {
    console.log("  [ReferralCode] missing — registry rows will be skipped");
  }

  const stats = { scanned: entries.size, generated: 0, rowsWritten: 0, registered: 0, skipped: 0 };

  for (const entry of entries.values()) {
    const missingTargets = entry.targets.filter((t) => !t.referralCode);
    const existingCode = entry.targets.find((t) => t.referralCode)?.referralCode || null;

    const distinctCodes = new Set(entry.targets.map((t) => t.referralCode).filter(Boolean));
    if (distinctCodes.size > 1) {
      console.log(
        `  ! ${ENTITY_LABEL[entry.entityType]} ${entry.label} has conflicting codes (${[...distinctCodes].join(", ")}) — left untouched`
      );
      stats.skipped += 1;
      continue;
    }

    let code = existingCode;
    if (!code) {
      if (DRY_RUN) {
        console.log(
          `  + ${ENTITY_LABEL[entry.entityType]} ${entry.label} — would get a new code (${entry.targets.map((t) => t.table).join(", ")})`
        );
        stats.generated += 1;
        continue;
      }
      code = await generateUniqueReferralCode({ entityType: entry.entityType });
      stats.generated += 1;
    } else if (missingTargets.length === 0) {
      // Code present everywhere; only the registry row may still need repair.
      if (!registryExists) continue;
      const registryRow = await getReferralCodeRecord(code);
      if (registryRow) continue;
    }

    if (!DRY_RUN) {
      for (const target of missingTargets) {
        await writeReferralCode(target.table, entry.id, code);
        stats.rowsWritten += 1;
      }
    }

    if (registryExists) {
      const registryRow = await getReferralCodeRecord(code);
      if (!registryRow) {
        const ownerCoachId =
          entry.ownerCoachId ||
          (entry.entityType === "wellness_coach" ? entry.id : "pending");
        if (DRY_RUN) {
          console.log(`  ~ ${ENTITY_LABEL[entry.entityType]} ${entry.label} — would register ${code}`);
        } else {
          await registerReferralCode({
            referralCode: code,
            entityType: entry.entityType,
            entityId: entry.id,
            ownerCoachId,
          });
          stats.registered += 1;
        }
      }
    }

    if (!DRY_RUN && missingTargets.length > 0) {
      console.log(
        `  ✓ ${ENTITY_LABEL[entry.entityType]} ${entry.label} → ${code} (${missingTargets.map((t) => t.table).join(", ")})`
      );
    }
  }

  console.log(
    `\nStaff records: ${stats.scanned} · codes generated: ${stats.generated} · table rows written: ${stats.rowsWritten} · registry rows added: ${stats.registered} · skipped: ${stats.skipped}`
  );
  if (DRY_RUN) console.log("Dry run — nothing was written.");
}

run().catch((err) => {
  console.error("Backfill failed:", err);
  process.exitCode = 1;
});
