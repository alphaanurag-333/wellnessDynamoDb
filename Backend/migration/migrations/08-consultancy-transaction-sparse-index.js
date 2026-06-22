/**
 * Fix ConsultancyTransaction sparse GSIs: remove null/empty parentCoachId and meetingAssigneeId.
 * DynamoDB rejects NULL values on GSI partition keys (breaks orders without referral).
 */
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../../config/db");
const { backupTable, scanTable } = require("../lib/helpers");

const TABLE = "ConsultancyTransaction";
const SPARSE_GSI_KEYS = ["parentCoachId", "meetingAssigneeId"];

function sparseKeysToRemove(item) {
  return SPARSE_GSI_KEYS.filter((key) => item[key] == null || item[key] === "");
}

async function migrateConsultancyTransactionSparseIndex() {
  console.log(`[${TABLE}] Scanning for null sparse GSI keys...`);
  const items = await scanTable(TABLE);
  const pending = items
    .map((item) => ({ item, keys: sparseKeysToRemove(item) }))
    .filter(({ keys }) => keys.length > 0);

  if (pending.length === 0) {
    console.log(`[${TABLE}] No null sparse GSI keys — skip.`);
    return { table: TABLE, updated: 0 };
  }

  await backupTable(TABLE);

  const now = new Date().toISOString();
  for (const { item, keys } of pending) {
    const removeExpr = keys.map((k) => k).join(", ");
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { id: item.id },
        UpdateExpression: `REMOVE ${removeExpr} SET updatedAt = :updatedAt`,
        ExpressionAttributeValues: { ":updatedAt": now },
        ConditionExpression: "attribute_exists(id)",
      })
    );
    console.log(`  Removed ${keys.join(", ")} from ${item.id}`);
  }

  console.log(`[${TABLE}] Updated ${pending.length} item(s).`);
  return { table: TABLE, updated: pending.length };
}

module.exports = {
  id: "08-consultancy-transaction-sparse-index",
  TABLE,
  migrateConsultancyTransactionSparseIndex,
};
