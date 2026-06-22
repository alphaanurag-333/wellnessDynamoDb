/**
 * Fix User.ParentCoachIndex sparse GSI: remove null/empty parentCoachId attributes.
 * DynamoDB rejects NULL values on GSI keys (breaks Seek user registration).
 */
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../../config/db");
const {
  backupTable,
  addGlobalSecondaryIndex,
  describeTable,
  scanTable,
} = require("../lib/helpers");

const USER_TABLE = "User";

const PARENT_COACH_INDEX = {
  IndexName: "ParentCoachIndex",
  KeySchema: [
    { AttributeName: "parentCoachId", KeyType: "HASH" },
    { AttributeName: "createdAt", KeyType: "RANGE" },
  ],
  Projection: { ProjectionType: "ALL" },
  _attributeTypes: {
    parentCoachId: "S",
    createdAt: "S",
  },
};

async function ensureParentCoachIndex() {
  await addGlobalSecondaryIndex(USER_TABLE, PARENT_COACH_INDEX);
}

function needsSparseFix(item) {
  return item.parentCoachId == null || item.parentCoachId === "";
}

async function migrateUserParentCoachSparseIndex() {
  console.log(`[${USER_TABLE}] Ensuring ParentCoachIndex...`);
  await ensureParentCoachIndex();

  const items = await scanTable(USER_TABLE);
  const pending = items.filter(needsSparseFix);

  if (pending.length === 0) {
    console.log(`[${USER_TABLE}] No null parentCoachId — skip.`);
    return { table: USER_TABLE, updated: 0 };
  }

  await backupTable(USER_TABLE);

  const now = new Date().toISOString();
  for (const item of pending) {
    await docClient.send(
      new UpdateCommand({
        TableName: USER_TABLE,
        Key: { id: item.id },
        UpdateExpression: "REMOVE parentCoachId SET updatedAt = :updatedAt",
        ExpressionAttributeValues: { ":updatedAt": now },
        ConditionExpression: "attribute_exists(id)",
      })
    );
    console.log(`  Removed null parentCoachId from ${item.id}`);
  }

  console.log(`[${USER_TABLE}] Updated ${pending.length} item(s).`);
  return { table: USER_TABLE, updated: pending.length };
}

module.exports = {
  id: "07-user-parent-coach-sparse-index",
  USER_TABLE,
  migrateUserParentCoachSparseIndex,
};
