/**
 * Migration 43: AccessPolicy table for reusable access deny bundles.
 */
const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../../config/db");
const { getTableDefinition } = require("../lib/tableSchemas");
const { tableExists } = require("../lib/helpers");

const TABLE = "AccessPolicy";

async function migrateAccessPolicies() {
  if (await tableExists(TABLE)) {
    console.log(`  [${TABLE}] table already exists — skip`);
    return false;
  }

  const definition = getTableDefinition(TABLE);
  if (!definition) {
    throw new Error(`Missing table definition for ${TABLE}`);
  }

  await client.send(new CreateTableCommand(definition));
  console.log(`  [${TABLE}] table created`);
  return true;
}

module.exports = {
  id: "43-access-policies",
  migrateAccessPolicies,
};
