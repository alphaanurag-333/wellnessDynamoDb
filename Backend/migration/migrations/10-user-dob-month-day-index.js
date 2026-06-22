/**
 * User: add DobMonthDayIndex GSI and backfill dobMonthDay from dob.
 */
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../../config/db");
const { computeDobMonthDay } = require("../../utils/dobMonthDay");
const {
  backupTable,
  addGlobalSecondaryIndex,
  describeTable,
  tableHasIndex,
  scanTable,
} = require("../lib/helpers");

const USER_TABLE = "User";

const DOB_MONTH_DAY_INDEX = {
  IndexName: "DobMonthDayIndex",
  KeySchema: [
    { AttributeName: "dobMonthDay", KeyType: "HASH" },
    { AttributeName: "createdAt", KeyType: "RANGE" },
  ],
  Projection: { ProjectionType: "ALL" },
  _attributeTypes: {
    dobMonthDay: "S",
    createdAt: "S",
  },
};

async function migrateUserDobMonthDayIndex() {
  console.log(`[${USER_TABLE}] Ensuring DobMonthDayIndex...`);
  const table = await describeTable(USER_TABLE);

  if (!tableHasIndex(table, DOB_MONTH_DAY_INDEX.IndexName)) {
    await backupTable(USER_TABLE);
    await addGlobalSecondaryIndex(USER_TABLE, DOB_MONTH_DAY_INDEX);
  } else {
    console.log(`[${USER_TABLE}] DobMonthDayIndex already exists.`);
  }

  const items = await scanTable(USER_TABLE);
  let updated = 0;

  for (const item of items) {
    const nextMonthDay = computeDobMonthDay(item.dob);
    const currentMonthDay = item.dobMonthDay || null;

    if (nextMonthDay === currentMonthDay) continue;

    const now = new Date().toISOString();
    if (nextMonthDay) {
      await docClient.send(
        new UpdateCommand({
          TableName: USER_TABLE,
          Key: { id: item.id },
          UpdateExpression: "SET dobMonthDay = :dobMonthDay, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":dobMonthDay": nextMonthDay,
            ":updatedAt": now,
          },
        })
      );
    } else if (currentMonthDay) {
      await docClient.send(
        new UpdateCommand({
          TableName: USER_TABLE,
          Key: { id: item.id },
          UpdateExpression: "REMOVE dobMonthDay SET updatedAt = :updatedAt",
          ExpressionAttributeValues: { ":updatedAt": now },
        })
      );
    }
    updated += 1;
  }

  console.log(`[${USER_TABLE}] Backfilled dobMonthDay on ${updated} user(s).`);
  return { table: USER_TABLE, updated };
}

module.exports = {
  id: "10-user-dob-month-day-index",
  USER_TABLE,
  migrateUserDobMonthDayIndex,
};
