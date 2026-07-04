/**
 * Migration 25: MonthlyChampionPost + MonthlyChampionPostComment tables.
 */
const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../../config/db");
const { tableExists } = require("../lib/helpers");

const POST_TABLE = "MonthlyChampionPost";
const COMMENT_TABLE = "MonthlyChampionPostComment";

async function ensureMonthlyChampionPostTable() {
  if (await tableExists(POST_TABLE)) {
    console.log(`  [${POST_TABLE}] table already exists — skip`);
    return false;
  }

  const params = {
    TableName: POST_TABLE,
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "monthYear", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "StatusMonthYearIndex",
        KeySchema: [
          { AttributeName: "status", KeyType: "HASH" },
          { AttributeName: "monthYear", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "MonthYearCreatedAtIndex",
        KeySchema: [
          { AttributeName: "monthYear", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "UserMonthYearIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "monthYear", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  console.log(`  [${POST_TABLE}] Creating table...`);
  await client.send(new CreateTableCommand(params));
  console.log(`  [${POST_TABLE}] table created`);
  return true;
}

async function ensureMonthlyChampionPostCommentTable() {
  if (await tableExists(COMMENT_TABLE)) {
    console.log(`  [${COMMENT_TABLE}] table already exists — skip`);
    return false;
  }

  const params = {
    TableName: COMMENT_TABLE,
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "monthlyChampionPostId", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "MonthlyChampionPostCreatedAtIndex",
        KeySchema: [
          { AttributeName: "monthlyChampionPostId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  console.log(`  [${COMMENT_TABLE}] Creating table...`);
  await client.send(new CreateTableCommand(params));
  console.log(`  [${COMMENT_TABLE}] table created`);
  return true;
}

async function migrateMonthlyChampions() {
  console.log("Monthly Champions migration...");
  const postCreated = await ensureMonthlyChampionPostTable();
  const commentCreated = await ensureMonthlyChampionPostCommentTable();
  return { postTable: POST_TABLE, postCreated, commentTable: COMMENT_TABLE, commentCreated };
}

module.exports = {
  id: "25-monthly-champions",
  migrateMonthlyChampions,
  ensureMonthlyChampionPostTable,
  ensureMonthlyChampionPostCommentTable,
};
