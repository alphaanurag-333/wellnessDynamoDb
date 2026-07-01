/**
 * Migration 16: User progress photos (Your 180% View timeline) + onboarding step status backfill.
 */
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../../config/db");
const { getTableDefinition } = require("../lib/tableSchemas");
const {
  backupTable,
  scanTable,
  tableExists,
  createAllTables,
} = require("../lib/helpers");
const {
  defaultPaidOnboardingStepStatus,
  computePaidOnboardingCompleted,
  normalizePaidOnboardingStepStatus,
} = require("../../utils/paidOnboardingHelpers");

const USER_TABLE = "User";
const NEW_TABLES = ["UserProgressPhoto"];

async function ensureNewTables() {
  const pending = [];

  for (const tableName of NEW_TABLES) {
    if (await tableExists(tableName)) {
      console.log(`  [${tableName}] already exists — skip create`);
      continue;
    }
    const definition = getTableDefinition(tableName);
    if (!definition) {
      throw new Error(`Missing table definition for ${tableName}`);
    }
    pending.push(definition);
  }

  if (pending.length > 0) {
    await createAllTables(pending);
  }
}

function needsStepStatusBackfill(item) {
  if (!item || String(item.userTier || "").toLowerCase() !== "heal") return false;
  if (item.paidOnboardingStepStatus && typeof item.paidOnboardingStepStatus === "object") {
    return false;
  }
  return true;
}

async function backfillHealUserStepStatus() {
  console.log(`[${USER_TABLE}] Backfilling paidOnboardingStepStatus for heal users...`);
  const items = await scanTable(USER_TABLE);
  const pending = items.filter(needsStepStatusBackfill);

  if (pending.length === 0) {
    console.log(`[${USER_TABLE}] No step-status backfill needed.`);
    return { updated: 0 };
  }

  await backupTable(USER_TABLE);

  const now = new Date().toISOString();
  let updated = 0;

  for (const item of pending) {
    const defaults = defaultPaidOnboardingStepStatus();
    const legacyCompleted = Boolean(item.paidOnboardingCompleted);
    const legacyStep = String(item.paidOnboardingStep || "").toLowerCase();

    if (legacyCompleted) {
      for (const key of Object.keys(defaults)) {
        defaults[key] = "done";
      }
    } else if (legacyStep === "done" || legacyStep === "medical") {
      defaults.personalDetails = "done";
      defaults.profileSetup = "done";
      defaults.bodyMeasurement = "done";
      defaults.progressPhotos180 = "done";
      defaults.medicalConditions = "done";
    } else if (legacyStep === "body" || legacyStep === "profile") {
      defaults.personalDetails = "done";
      defaults.profileSetup = "done";
    }

    const stepStatus = normalizePaidOnboardingStepStatus(defaults);
    const completed = computePaidOnboardingCompleted(stepStatus);

    await docClient.send(
      new UpdateCommand({
        TableName: USER_TABLE,
        Key: { id: item.id },
        UpdateExpression:
          "SET paidOnboardingStepStatus = :status, paidOnboardingCompleted = :completed, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":status": stepStatus,
          ":completed": completed,
          ":updatedAt": now,
        },
        ConditionExpression: "attribute_exists(id)",
      })
    );
    updated += 1;
  }

  console.log(`[${USER_TABLE}] Backfilled step status for ${updated} heal user(s).`);
  return { updated };
}

async function migrateProgressPhotosAndOnboardingSteps() {
  console.log("Creating UserProgressPhoto table...");
  await ensureNewTables();
  return backfillHealUserStepStatus();
}

module.exports = {
  id: "16-progress-photos-and-onboarding-steps",
  USER_TABLE,
  NEW_TABLES,
  migrateProgressPhotosAndOnboardingSteps,
};
