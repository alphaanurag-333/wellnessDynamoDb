/**
 * One-off: drop retired blog tables (and all items in them).
 *
 *   node --use-system-ca scripts/dropBlogTables.js
 */
require("dotenv").config();

const {
  DeleteTableCommand,
  DescribeTableCommand,
  ListTablesCommand,
} = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");

const TABLES = ["BlogConfig", "BlogPost", "BlogMedia"];

async function tableExists(name) {
  try {
    await client.send(new DescribeTableCommand({ TableName: name }));
    return true;
  } catch (err) {
    if (err.name === "ResourceNotFoundException") return false;
    throw err;
  }
}

async function waitUntilGone(name) {
  for (let i = 0; i < 30; i += 1) {
    if (!(await tableExists(name))) return;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`${name} is still present after waiting for delete`);
}

async function dropTable(name) {
  if (!(await tableExists(name))) {
    console.log(`  ${name}: already gone`);
    return;
  }
  await client.send(new DeleteTableCommand({ TableName: name }));
  console.log(`  ${name}: delete started`);
  await waitUntilGone(name);
  console.log(`  ${name}: deleted`);
}

async function run() {
  const listed = await client.send(new ListTablesCommand({}));
  const names = listed.TableNames || [];
  console.log(`Region tables include blogs: ${TABLES.filter((t) => names.includes(t)).join(", ") || "(none)"}`);
  console.log("Dropping blog tables...\n");
  for (const name of TABLES) {
    await dropTable(name);
  }
  console.log("\nDone. BlogConfig, BlogPost, and BlogMedia are gone.");
}

run().catch((err) => {
  console.error("Drop failed:", err.message);
  process.exitCode = 1;
});
