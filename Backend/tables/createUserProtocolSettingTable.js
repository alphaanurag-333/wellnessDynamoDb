/**
 * Create UserProtocolSetting DynamoDB table.
 * Usage: node tables/createUserProtocolSettingTable.js
 */
require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");
const { getTableDefinition } = require("../migration/lib/tableSchemas");

const TABLE = "UserProtocolSetting";

async function createUserProtocolSettingTable() {
  const definition = getTableDefinition(TABLE);
  if (!definition) throw new Error(`Missing table definition for ${TABLE}`);

  try {
    const result = await client.send(new CreateTableCommand(definition));
    console.log("UserProtocolSetting table created:", result.TableDescription.TableArn);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("UserProtocolSetting table already exists");
      return;
    }
    console.error("Error creating UserProtocolSetting table:", err.message);
    process.exitCode = 1;
  }
}

createUserProtocolSettingTable();
