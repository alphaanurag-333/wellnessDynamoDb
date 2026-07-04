/**
 * Migration 26: ContactInquiry table for public website contact form submissions.
 */
const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../../config/db");
const { tableExists } = require("../lib/helpers");

const TABLE = "ContactInquiry";

async function migrateContactInquiries() {
  if (await tableExists(TABLE)) {
    console.log(`  [${TABLE}] table already exists — skip`);
    return false;
  }

  const params = {
    TableName: TABLE,
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "StatusCreatedAtIndex",
        KeySchema: [
          { AttributeName: "status", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  await client.send(new CreateTableCommand(params));
  console.log(`  [${TABLE}] table created`);
  return true;
}

module.exports = {
  id: "26-contact-inquiries",
  migrateContactInquiries,
};
