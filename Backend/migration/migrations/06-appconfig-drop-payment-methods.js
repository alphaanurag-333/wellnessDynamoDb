/**
 * Remove deprecated payment_methods from AppConfig singleton row(s).
 */
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../../config/db");
const { backupTable, scanTable } = require("../lib/helpers");

const TABLE = "AppConfig";

async function migrateAppConfigDropPaymentMethods() {
  console.log(`[${TABLE}] Scanning for payment_methods...`);
  const items = await scanTable(TABLE);
  const pending = items.filter((item) => item.payment_methods !== undefined);

  if (pending.length === 0) {
    console.log(`[${TABLE}] No payment_methods attribute — skip.`);
    return { table: TABLE, updated: 0 };
  }

  await backupTable(TABLE);

  const now = new Date().toISOString();
  for (const item of pending) {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { id: item.id },
        UpdateExpression: "REMOVE payment_methods SET updatedAt = :updatedAt",
        ExpressionAttributeValues: { ":updatedAt": now },
        ConditionExpression: "attribute_exists(id)",
      })
    );
    console.log(`  Removed payment_methods from ${item.id}`);
  }

  console.log(`[${TABLE}] Updated ${pending.length} item(s).`);
  return { table: TABLE, updated: pending.length };
}

module.exports = {
  id: "06-appconfig-drop-payment-methods",
  TABLE,
  migrateAppConfigDropPaymentMethods,
};
