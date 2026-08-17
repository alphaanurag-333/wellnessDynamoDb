/**
 * Migration 39: Diet plan book CMS (title + content + live).
 */
const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../../config/db");
const { tableExists, waitForGsiActive } = require("../lib/helpers");
const { getTableDefinition } = require("../lib/tableSchemas");

const TABLE = "DietPlanBook";

async function migrateDietPlanBook() {
  if (await tableExists(TABLE)) {
    console.log(`  [${TABLE}] table already exists — skip`);
    return false;
  }

  const params = getTableDefinition(TABLE);
  if (!params) {
    throw new Error(`Missing table definition for ${TABLE}`);
  }

  await client.send(new CreateTableCommand(params));
  console.log(`  [${TABLE}] table created`);
  await waitForGsiActive(TABLE, "StatusIndex");
  return true;
}

module.exports = {
  id: "39-diet-plan-book",
  migrateDietPlanBook,
};
