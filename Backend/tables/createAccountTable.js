/**
 * Create the staff Account table (canonical definition from tableSchemas).
 */
const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");
const { getTableDefinition } = require("../migration/lib/tableSchemas");

async function createAccountTable() {
  const definition = getTableDefinition("Account");
  if (!definition) {
    throw new Error("Missing Account table definition");
  }
  await client.send(new CreateTableCommand(definition));
  console.log("[Account] table create requested");
  return definition;
}

if (require.main === module) {
  require("dotenv").config();
  createAccountTable()
    .then(() => {
      console.log("Done");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { createAccountTable };
