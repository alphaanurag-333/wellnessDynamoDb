/**
 * Ensure Accounts table exists, then seed a Super Admin (accountKind: admin).
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedSuperAdmin.js
 *   node --use-system-ca scripts/seedSuperAdmin.js --email=admin@gmail.com --password=12345678 --name=Admin
 */
require("dotenv").config();

const {
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");
const { getTableDefinition } = require("../migration/lib/tableSchemas");
const { createAdmin, getAdminByEmail, toPublicAdmin } = require("../models/adminModel");
const { hashPassword } = require("../utils/password");

function argValue(flag, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (!hit) return fallback;
  return hit.slice(flag.length + 1);
}

async function ensureAccountsTable() {
  try {
    await client.send(new DescribeTableCommand({ TableName: "Accounts" }));
    console.log("Accounts table already exists");
    return;
  } catch (err) {
    if (err.name !== "ResourceNotFoundException") throw err;
  }

  const params = getTableDefinition("Accounts");
  if (!params) throw new Error("No schema for table Accounts");
  await client.send(new CreateTableCommand(params));
  console.log("Creating Accounts table…");
  await waitUntilTableExists({ client, maxWaitTime: 180 }, { TableName: "Accounts" });
  console.log("Accounts table ready");
}

async function main() {
  const email = argValue("--email", "admin@gmail.com");
  const password = argValue("--password", "12345678");
  const name = argValue("--name", "Admin");

  await ensureAccountsTable();

  const existing = await getAdminByEmail(email);
  if (existing) {
    console.log("Admin already exists:", toPublicAdmin(existing));
    console.log("Email:", email);
    return;
  }

  const passwordHash = await hashPassword(password);
  const admin = await createAdmin({
    name,
    email,
    password: passwordHash,
    status: "active",
    isSuperAdmin: true,
  });

  console.log("Super Admin created:");
  console.log(toPublicAdmin(admin));
  console.log("Login:", email);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
