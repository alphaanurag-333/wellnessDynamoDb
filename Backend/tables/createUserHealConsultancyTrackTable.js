/**
 * Create UserHealConsultancyTrack DynamoDB table.
 * Usage: node tables/createUserHealConsultancyTrackTable.js
 */
require("dotenv").config();
const { DynamoDBClient, CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { getTableDefinition } = require("../migration/lib/tableSchemas");

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-south-1",
  ...(process.env.AWS_ENDPOINT && {
    endpoint: process.env.AWS_ENDPOINT,
    credentials: { accessKeyId: "local", secretAccessKey: "local" },
  }),
});

const TABLE = "UserHealConsultancyTrack";

async function createUserHealConsultancyTrackTable() {
  const definition = getTableDefinition(TABLE);
  if (!definition) throw new Error(`Missing table definition for ${TABLE}`);

  try {
    const result = await client.send(new CreateTableCommand(definition));
    console.log("UserHealConsultancyTrack table created:", result.TableDescription.TableArn);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("UserHealConsultancyTrack table already exists");
      return;
    }
    throw err;
  }
}

createUserHealConsultancyTrackTable();
