/**
 * Migration 24: UserCommitmentLetter table for commitment letter submissions.
 */
const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../../config/db");
const { tableExists } = require("../lib/helpers");

const TABLE = "UserCommitmentLetter";

async function ensureUserCommitmentLetterTable() {
  if (await tableExists(TABLE)) {
    console.log(`  [${TABLE}] table already exists — skip`);
    return false;
  }

  const params = {
    TableName: TABLE,
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
      { AttributeName: "approvalStatus", AttributeType: "S" },
      { AttributeName: "managedByCoachId", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "ApprovalStatusCreatedAtIndex",
        KeySchema: [
          { AttributeName: "approvalStatus", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "ManagedByCoachIdCreatedAtIndex",
        KeySchema: [
          { AttributeName: "managedByCoachId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "UserIdCreatedAtIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  console.log(`  [${TABLE}] Creating table...`);
  await client.send(new CreateTableCommand(params));
  console.log(`  [${TABLE}] table created`);
  return true;
}

async function migrateUserCommitmentLetter() {
  console.log("UserCommitmentLetter migration...");
  const created = await ensureUserCommitmentLetterTable();
  return { table: TABLE, created };
}

module.exports = {
  id: "24-user-commitment-letter",
  migrateUserCommitmentLetter,
  ensureUserCommitmentLetterTable,
};
