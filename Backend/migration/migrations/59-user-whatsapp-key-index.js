/**
 * Migration 59: User WhatsappKeyIndex GSI for unique WhatsApp login lookups.
 *
 *  1. Add WhatsappKeyIndex (whatsappKey HASH) if missing.
 *  2. Backfill whatsappKey from effective WhatsApp (sameAsMobile ? phone : whatsappPhone).
 *  3. Report duplicate whatsappKey groups for admin cleanup.
 */
const { UpdateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { client, docClient } = require("../../config/db");
const { backupTable, scanTable, tableExists, waitForGsiActive } = require("../lib/helpers");
const {
  normalizeCountryCode,
  normalizePhone,
  buildPhoneKey,
} = require("../../models/userModel");

const TABLE = "User";
const INDEX_NAME = "WhatsappKeyIndex";

function isTruthyFlag(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null || value === "") return false;
  const s = String(value).trim().toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return Boolean(value);
}

function resolveEffectiveWhatsappKey(user) {
  if (isTruthyFlag(user?.whatsappSameAsMobile)) {
    return buildPhoneKey(user.phoneCountryCode, user.phone);
  }
  return buildPhoneKey(user.whatsappCountryCode, user.whatsappPhone);
}

async function ensureWhatsappKeyIndex() {
  if (!(await tableExists(TABLE))) {
    console.log(`  [${TABLE}] table does not exist — skip GSI`);
    return false;
  }

  const { Table } = await client.send(new DescribeTableCommand({ TableName: TABLE }));
  const existingIndexes = (Table.GlobalSecondaryIndexes || []).map((g) => g.IndexName);
  if (existingIndexes.includes(INDEX_NAME)) {
    const gsi = (Table.GlobalSecondaryIndexes || []).find((g) => g.IndexName === INDEX_NAME);
    if (gsi?.IndexStatus !== "ACTIVE") {
      await waitForGsiActive(TABLE, INDEX_NAME);
    }
    console.log(`  [${TABLE}] ${INDEX_NAME} already exists — skip`);
    return false;
  }

  const definedAttrs = new Map(
    (Table.AttributeDefinitions || []).map((a) => [a.AttributeName, a.AttributeType])
  );
  if (!definedAttrs.has("whatsappKey")) {
    definedAttrs.set("whatsappKey", "S");
  }

  const attributeDefinitions = [...definedAttrs.entries()].map(([AttributeName, AttributeType]) => ({
    AttributeName,
    AttributeType,
  }));

  const billingMode = Table.BillingModeSummary?.BillingMode;
  const isPayPerRequest = billingMode === "PAY_PER_REQUEST";
  const gsiCreate = {
    IndexName: INDEX_NAME,
    KeySchema: [{ AttributeName: "whatsappKey", KeyType: "HASH" }],
    Projection: { ProjectionType: "ALL" },
  };

  if (!isPayPerRequest) {
    const throughput =
      Table.GlobalSecondaryIndexes?.[0]?.ProvisionedThroughput || Table.ProvisionedThroughput;
    gsiCreate.ProvisionedThroughput = {
      ReadCapacityUnits: throughput?.ReadCapacityUnits || 5,
      WriteCapacityUnits: throughput?.WriteCapacityUnits || 5,
    };
  }

  console.log(`  [${TABLE}] Adding ${INDEX_NAME} GSI...`);
  await client.send(
    new UpdateTableCommand({
      TableName: TABLE,
      AttributeDefinitions: attributeDefinitions,
      GlobalSecondaryIndexUpdates: [{ Create: gsiCreate }],
    })
  );

  await waitForGsiActive(TABLE, INDEX_NAME);
  console.log(`  [${TABLE}] ${INDEX_NAME} GSI is ACTIVE`);
  return true;
}

async function backfillWhatsappKeys() {
  if (!(await tableExists(TABLE))) {
    console.log(`  [${TABLE}] table does not exist — skip whatsappKey backfill`);
    return { updated: 0, removed: 0, duplicates: [] };
  }

  console.log(`[${TABLE}] Scanning users for whatsappKey backfill...`);
  const items = await scanTable(TABLE);
  if (!items.length) {
    console.log(`[${TABLE}] No users to backfill.`);
    return { updated: 0, removed: 0, duplicates: [] };
  }

  await backupTable(TABLE);

  const now = new Date().toISOString();
  let updated = 0;
  let removed = 0;
  const byKey = new Map();

  for (const item of items) {
    if (item.status === "deleted") {
      if (item.whatsappKey != null && item.whatsappKey !== "") {
        await docClient.send(
          new UpdateCommand({
            TableName: TABLE,
            Key: { id: item.id },
            UpdateExpression:
              "SET deletedWhatsappKey = if_not_exists(deletedWhatsappKey, :key), updatedAt = :updatedAt " +
              "REMOVE whatsappKey",
            ExpressionAttributeValues: {
              ":key": String(item.whatsappKey),
              ":updatedAt": now,
            },
            ConditionExpression: "attribute_exists(id)",
          })
        );
        removed += 1;
      }
      continue;
    }

    const nextKey = resolveEffectiveWhatsappKey(item);
    const currentKey = item.whatsappKey != null ? String(item.whatsappKey) : "";

    if (!nextKey) {
      if (currentKey) {
        await docClient.send(
          new UpdateCommand({
            TableName: TABLE,
            Key: { id: item.id },
            UpdateExpression: "SET updatedAt = :updatedAt REMOVE whatsappKey",
            ExpressionAttributeValues: { ":updatedAt": now },
            ConditionExpression: "attribute_exists(id)",
          })
        );
        removed += 1;
      }
      continue;
    }

    if (currentKey !== nextKey) {
      const sameAsMobile = isTruthyFlag(item.whatsappSameAsMobile);
      const waCc = sameAsMobile
        ? normalizeCountryCode(item.phoneCountryCode)
        : normalizeCountryCode(item.whatsappCountryCode);
      const waPhone = sameAsMobile
        ? normalizePhone(item.phone)
        : normalizePhone(item.whatsappPhone);

      await docClient.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { id: item.id },
          UpdateExpression:
            "SET whatsappKey = :whatsappKey, whatsappCountryCode = :waCc, " +
            "whatsappPhone = :waPhone, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":whatsappKey": nextKey,
            ":waCc": waCc,
            ":waPhone": waPhone,
            ":updatedAt": now,
          },
          ConditionExpression: "attribute_exists(id)",
        })
      );
      updated += 1;
    }

    const group = byKey.get(nextKey) || [];
    group.push({
      id: item.id,
      name: item.name || "",
      email: item.email || item.deletedEmail || "",
      status: item.status || "",
    });
    byKey.set(nextKey, group);
  }

  const duplicates = [...byKey.entries()]
    .filter(([, users]) => users.length > 1)
    .map(([whatsappKey, users]) => ({ whatsappKey, users }));

  if (duplicates.length) {
    console.log(`[${TABLE}] DUPLICATE WhatsApp keys found (${duplicates.length} group(s)):`);
    for (const group of duplicates) {
      console.log(`  ${group.whatsappKey}`);
      for (const u of group.users) {
        console.log(`    - id=${u.id} name="${u.name}" email=${u.email} status=${u.status}`);
      }
    }
  } else {
    console.log(`[${TABLE}] No duplicate WhatsApp keys among active users.`);
  }

  console.log(
    `[${TABLE}] Backfill complete: updated=${updated}, removed=${removed}, duplicateGroups=${duplicates.length}`
  );
  return { updated, removed, duplicates };
}

async function migrateUserWhatsappKeyIndex() {
  console.log("User WhatsappKeyIndex migration...");
  const indexCreated = await ensureWhatsappKeyIndex();
  const backfill = await backfillWhatsappKeys();
  return {
    table: TABLE,
    indexCreated,
    backfillUpdated: backfill.updated,
    backfillRemoved: backfill.removed,
    duplicateGroups: backfill.duplicates.length,
    duplicates: backfill.duplicates,
  };
}

module.exports = {
  id: "59-user-whatsapp-key-index",
  migrateUserWhatsappKeyIndex,
  ensureWhatsappKeyIndex,
  backfillWhatsappKeys,
};
