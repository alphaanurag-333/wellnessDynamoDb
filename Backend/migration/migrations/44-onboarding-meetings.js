/**
 * Migration 44: Onboarding meetings, RCA, and per-client protocol tables.
 */
const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../../config/db");
const { getTableDefinition } = require("../lib/tableSchemas");
const { tableExists } = require("../lib/helpers");

const TABLES = ["OnboardingMeeting", "UserOnboardingRca", "UserProtocol"];

async function ensureTable(tableName) {
  if (await tableExists(tableName)) {
    console.log(`  [${tableName}] table already exists — skip`);
    return false;
  }
  const definition = getTableDefinition(tableName);
  if (!definition) {
    throw new Error(`Missing table definition for ${tableName}`);
  }
  await client.send(new CreateTableCommand(definition));
  console.log(`  [${tableName}] table created`);
  return true;
}

async function migrateOnboardingMeetings() {
  console.log("Onboarding meeting / RCA / protocol tables...");
  for (const table of TABLES) {
    await ensureTable(table);
  }
}

module.exports = {
  id: "44-onboarding-meetings",
  migrateOnboardingMeetings,
};
