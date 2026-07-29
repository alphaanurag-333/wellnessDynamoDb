/**
 * Create global Accounts table, migrate Admin/WellnessCoach/Assistant rows into it,
 * reseed default admin+coach if needed, then delete legacy identity tables.
 *
 * Legacy Admin / WellnessCoach / AssistantWellnessCoach schemas are no longer in
 * tableSchemas.js — Accounts is the only panel-identity table ensure* scripts create.
 * This script still scans those tables if they still exist in AWS.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/migrateToAccounts.js --yes
 */
require("dotenv").config();

const {
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  ListTablesCommand,
  ScanCommand,
  waitUntilTableExists,
  waitUntilTableNotExists,
} = require("@aws-sdk/client-dynamodb");
const { ScanCommand: DocScanCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { client, docClient } = require("../config/db");
const { getTableDefinition } = require("../migration/lib/tableSchemas");
const { hashPassword } = require("../utils/password");
const {
  getAccountByEmail,
  createAccount,
  putAccountRaw,
} = require("../models/accountModel");
const {
  createSpecialization,
  getSpecializationByTitleKey,
  buildTitleKey,
} = require("../models/specializationModel");
const { registerReferralCode, generateUniqueReferralCode } = require("../models/referralCodeModel");

async function tableExists(name) {
  try {
    await client.send(new DescribeTableCommand({ TableName: name }));
    return true;
  } catch (err) {
    if (err.name === "ResourceNotFoundException") return false;
    throw err;
  }
}

async function ensureTable(name) {
  if (await tableExists(name)) {
    console.log(`${name} exists`);
    return;
  }
  const params = getTableDefinition(name);
  if (!params) throw new Error(`No schema for ${name}`);
  await client.send(new CreateTableCommand(params));
  console.log(`Creating ${name}…`);
  await waitUntilTableExists({ client, maxWaitTime: 180 }, { TableName: name });
  console.log(`${name} ready`);
}

async function scanAll(tableName) {
  if (!(await tableExists(tableName))) return [];
  const items = [];
  let ExclusiveStartKey;
  do {
    const res = await docClient.send(
      new DocScanCommand({
        TableName: tableName,
        ExclusiveStartKey,
      })
    );
    items.push(...(res.Items || []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function putIfMissing(item) {
  try {
    await putAccountRaw(item);
    console.log(`  + migrated ${item.email} (${item.accountKind})`);
    return true;
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      console.log(`  = skip existing id ${item.id}`);
      return false;
    }
    throw err;
  }
}

async function deleteTable(name) {
  if (!(await tableExists(name))) {
    console.log(`${name} already gone`);
    return;
  }
  await client.send(new DeleteTableCommand({ TableName: name }));
  console.log(`Deleting ${name}…`);
  await waitUntilTableNotExists({ client, maxWaitTime: 300 }, { TableName: name });
  console.log(`${name} deleted`);
}

async function ensureGeneralSpecialization() {
  await ensureTable("Specialization");
  const title = "General Wellness";
  const existing = await getSpecializationByTitleKey(buildTitleKey(title));
  if (existing) return existing;
  return createSpecialization({
    title,
    description: "Holistic lifestyle coaching for overall health improvement.",
    status: "active",
  });
}

async function main() {
  if (!process.argv.includes("--yes")) {
    console.error("Pass --yes to migrate identity into Accounts and drop legacy tables.");
    process.exit(1);
  }

  await ensureTable("ReferralCode");
  await ensureTable("Role");
  await ensureTable("Accounts");

  const admins = await scanAll("Admin");
  for (const row of admins) {
    await putIfMissing({
      ...row,
      accountKind: "admin",
      isSuperAdmin: Boolean(row.isSuperAdmin),
    });
  }

  const coaches = await scanAll("WellnessCoach");
  for (const row of coaches) {
    const { password, ...rest } = row;
    await putIfMissing({
      ...rest,
      password,
      accountKind: "coach",
      isSuperAdmin: false,
      approvalStatus: row.approvalStatus || "approved",
    });
  }

  const assistants = await scanAll("AssistantWellnessCoach");
  for (const row of assistants) {
    const parent = row.wellnessCoachId || row.parentAccountId;
    await putIfMissing({
      ...row,
      accountKind: "assistant",
      parentAccountId: parent,
      wellnessCoachId: parent,
      isSuperAdmin: false,
    });
  }

  // Reseed defaults if missing
  if (!(await getAccountByEmail("admin@gmail.com"))) {
    await createAccount({
      name: "Admin",
      email: "admin@gmail.com",
      password: await hashPassword("12345678"),
      status: "active",
      isSuperAdmin: true,
      accountKind: "admin",
    });
    console.log("Seeded Super Admin admin@gmail.com");
  }

  if (!(await getAccountByEmail("coach@gmail.com"))) {
    await ensureTable("ReferralCode");
    const spec = await ensureGeneralSpecialization();
    const referralCode = await generateUniqueReferralCode();
    const coach = await createAccount({
      name: "Wellness Coach",
      email: "coach@gmail.com",
      password: await hashPassword("12345678"),
      phoneCountryCode: "+91",
      phone: "9876543210",
      status: "active",
      accountKind: "coach",
      approvalStatus: "approved",
      specializationId: spec.id,
      referralCode,
      webVisible: true,
      appVisible: true,
      country: "India",
    });
    await registerReferralCode({
      referralCode: coach.referralCode || referralCode,
      entityType: "wellness_coach",
      entityId: coach.id,
      ownerCoachId: coach.id,
    });
    console.log("Seeded Coach coach@gmail.com");
  }

  // Drop legacy identity tables — Accounts is the source of truth.
  await deleteTable("Admin");
  await deleteTable("WellnessCoach");
  await deleteTable("AssistantWellnessCoach");
  await deleteTable("StaffAccount");

  console.log("\nDone. Identity is now the Accounts table.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
