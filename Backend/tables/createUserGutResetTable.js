/**
 * Create UserGutReset DynamoDB table.
 * Usage: node tables/createUserGutResetTable.js
 */
require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");
const { getTableDefinition } = require("../migration/lib/tableSchemas");

const TABLE = "UserGutReset";

async function createUserGutResetTable() {
  const definition = getTableDefinition(TABLE);
  if (!definition) throw new Error(`Missing table definition for ${TABLE}`);

  try {
    const result = await client.send(new CreateTableCommand(definition));
    console.log("UserGutReset table created:", result.TableDescription.TableArn);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("UserGutReset table already exists");
      return;
    }
    console.error("Error creating UserGutReset table:", err.message);
    process.exitCode = 1;
  }
}

createUserGutResetTable();
