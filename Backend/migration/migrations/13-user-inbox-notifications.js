/**
 * User inbox: extend Notification (kind + UserSentAtIndex GSI) and create UserNotificationRead.
 */
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../../config/db");
const { getTableDefinition } = require("../lib/tableSchemas");
const {
  backupTable,
  scanTable,
  addGlobalSecondaryIndex,
  tableHasIndex,
  describeTable,
  createAllTables,
  tableExists,
} = require("../lib/helpers");

const NOTIFICATION_TABLE = "Notification";
const READ_TABLE = "UserNotificationRead";

const USER_SENT_AT_GSI = {
  IndexName: "UserSentAtIndex",
  KeySchema: [
    { AttributeName: "userId", KeyType: "HASH" },
    { AttributeName: "sentAt", KeyType: "RANGE" },
  ],
  Projection: { ProjectionType: "ALL" },
  _attributeTypes: {
    userId: "S",
    sentAt: "S",
  },
};

async function ensureUserSentAtIndex() {
  console.log(`[${NOTIFICATION_TABLE}] Checking UserSentAtIndex...`);
  const table = await describeTable(NOTIFICATION_TABLE);
  if (tableHasIndex(table, USER_SENT_AT_GSI.IndexName)) {
    console.log(`[${NOTIFICATION_TABLE}] UserSentAtIndex already exists — skip.`);
    return { skipped: true };
  }

  await backupTable(NOTIFICATION_TABLE);
  await addGlobalSecondaryIndex(NOTIFICATION_TABLE, USER_SENT_AT_GSI);
  return { skipped: false };
}

async function backfillNotificationKind() {
  console.log(`[${NOTIFICATION_TABLE}] Backfilling kind=admin_broadcast on legacy rows...`);
  const items = await scanTable(NOTIFICATION_TABLE);
  const pending = items.filter((item) => !item.kind);

  if (pending.length === 0) {
    console.log(`[${NOTIFICATION_TABLE}] All rows already have kind — skip.`);
    return { updated: 0 };
  }

  for (const item of pending) {
    await docClient.send(
      new UpdateCommand({
        TableName: NOTIFICATION_TABLE,
        Key: { id: item.id },
        UpdateExpression: "SET #kind = :kind",
        ExpressionAttributeNames: { "#kind": "kind" },
        ExpressionAttributeValues: { ":kind": "admin_broadcast" },
      })
    );
  }

  console.log(`[${NOTIFICATION_TABLE}] Backfilled kind on ${pending.length} item(s).`);
  return { updated: pending.length };
}

async function ensureUserNotificationReadTable() {
  console.log(`[${READ_TABLE}] Ensuring table exists...`);
  if (await tableExists(READ_TABLE)) {
    console.log(`[${READ_TABLE}] Already exists — skip.`);
    return { skipped: true };
  }

  const definition = getTableDefinition(READ_TABLE);
  if (!definition) {
    throw new Error(`Missing table definition for ${READ_TABLE}`);
  }

  await createAllTables([definition]);
  return { skipped: false };
}

async function migrateUserInboxNotifications() {
  await ensureUserSentAtIndex();
  await backfillNotificationKind();
  await ensureUserNotificationReadTable();
}

module.exports = {
  id: "13-user-inbox-notifications",
  TABLES: [NOTIFICATION_TABLE, READ_TABLE],
  migrateUserInboxNotifications,
};
