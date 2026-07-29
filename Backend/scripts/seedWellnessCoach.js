/**
 * Ensure Accounts (+ ReferralCode, Specialization) tables exist,
 * then seed an approved wellness coach (accountKind: coach).
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedWellnessCoach.js
 *   node --use-system-ca scripts/seedWellnessCoach.js --email=coach@gmail.com --password=12345678
 */
require("dotenv").config();

const {
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");
const { getTableDefinition } = require("../migration/lib/tableSchemas");
const {
  createWellnessCoach,
  getWellnessCoachByEmail,
  toPublicWellnessCoach,
} = require("../models/wellnessCoachModel");
const {
  createSpecialization,
  getSpecializationByTitleKey,
  buildTitleKey,
} = require("../models/specializationModel");
const { hashPassword } = require("../utils/password");

function argValue(flag, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (!hit) return fallback;
  return hit.slice(flag.length + 1);
}

async function ensureTable(tableName) {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`${tableName} table already exists`);
    return;
  } catch (err) {
    if (err.name !== "ResourceNotFoundException") throw err;
  }

  const params = getTableDefinition(tableName);
  if (!params) throw new Error(`No schema for table ${tableName}`);
  await client.send(new CreateTableCommand(params));
  console.log(`Creating ${tableName} table…`);
  await waitUntilTableExists({ client, maxWaitTime: 180 }, { TableName: tableName });
  console.log(`${tableName} table ready`);
}

async function ensureGeneralSpecialization() {
  const title = "General Wellness";
  const titleKey = buildTitleKey(title);
  let spec = await getSpecializationByTitleKey(titleKey);
  if (spec) return spec;

  spec = await createSpecialization({
    title,
    description: "Holistic lifestyle coaching for overall health improvement.",
    status: "active",
  });
  console.log("Specialization created:", spec.id, spec.title);
  return spec;
}

async function main() {
  const email = argValue("--email", "coach@gmail.com");
  const password = argValue("--password", "12345678");
  const name = argValue("--name", "Wellness Coach");
  const phone = argValue("--phone", "9876543210");

  await ensureTable("ReferralCode");
  await ensureTable("Specialization");
  await ensureTable("Accounts");

  const existing = await getWellnessCoachByEmail(email);
  if (existing) {
    console.log("Wellness coach already exists:");
    console.log(toPublicWellnessCoach(existing));
    console.log("Login:", email);
    return;
  }

  const specialization = await ensureGeneralSpecialization();
  const passwordHash = await hashPassword(password);

  const coach = await createWellnessCoach({
    name,
    email,
    password: passwordHash,
    phoneCountryCode: "+91",
    phone,
    specializationId: specialization.id,
    status: "active",
    approvalStatus: "approved",
    webVisible: true,
    appVisible: true,
    country: "India",
    bio: "Seeded wellness coach account",
  });

  console.log("Wellness Coach created:");
  console.log(coach);
  console.log("Login:", email);
  console.log("Password:", password);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
