// /**
//  * Copy DynamoDB table data from one region to another.
//  *
//  * Usage (from repo root):
//  *   node Backend/script/migrate.js              # all tables (from Backend/tables/*.js)
//  *   node Backend/script/migrate.js --all        # same
//  *   node Backend/script/migrate.js User         # one table
//  *   node Backend/script/migrate.js --list     # print table names only
//  *
//  * Env (Backend/.env):
//  *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
//  *   AWS_REGION              — source region (e.g. us-east-1)
//  *   MIGRATE_SOURCE_REGION   — optional source override
//  *   MIGRATE_TARGET_REGION   — target region (default ap-south-1)
//  *   MIGRATE_SKIP_MISSING    — if "true", skip tables missing in source
//  */
// require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

// const fs = require("fs");
// const path = require("path");
// const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
// const {
//   DynamoDBDocumentClient,
//   ScanCommand,
//   BatchWriteCommand,
// } = require("@aws-sdk/lib-dynamodb");

// const BATCH_WRITE_SIZE = 25;
// const TABLES_DIR = path.join(__dirname, "..", "tables");

// /** Table names declared in Backend/tables/create*.js */
// function discoverTableNames() {
//   const files = fs.readdirSync(TABLES_DIR).filter((f) => f.endsWith(".js"));
//   const names = new Set();
//   const re = /TableName:\s*["']([^"']+)["']/g;

//   for (const file of files) {
//     const content = fs.readFileSync(path.join(TABLES_DIR, file), "utf8");
//     let match;
//     while ((match = re.exec(content)) !== null) {
//       names.add(match[1]);
//     }
//   }

//   return [...names].sort((a, b) => a.localeCompare(b));
// }

// function getCredentials() {
//   const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
//   const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
//   if (!accessKeyId || !secretAccessKey) {
//     console.error(
//       "Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY. Set them in Backend/.env"
//     );
//     process.exit(1);
//   }
//   return { accessKeyId, secretAccessKey };
// }

// function createDynamoClient(region) {
//   return new DynamoDBClient({
//     region,
//     credentials: getCredentials(),
//   });
// }

// function createDocClient(region) {
//   return DynamoDBDocumentClient.from(createDynamoClient(region), {
//     marshallOptions: { removeUndefinedValues: true },
//   });
// }

// async function batchWriteAll(docClient, tableName, items) {
//   for (let i = 0; i < items.length; i += BATCH_WRITE_SIZE) {
//     const chunk = items.slice(i, i + BATCH_WRITE_SIZE);
//     let requestItems = {
//       [tableName]: chunk.map((Item) => ({ PutRequest: { Item } })),
//     };

//     for (let attempt = 0; attempt < 5; attempt += 1) {
//       const { UnprocessedItems } = await docClient.send(
//         new BatchWriteCommand({ RequestItems: requestItems })
//       );
//       const pending = UnprocessedItems?.[tableName];
//       if (!pending?.length) break;
//       requestItems = UnprocessedItems;
//       await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
//     }
//   }
// }

// async function migrateTable(sourceDoc, targetDoc, tableName, { sourceRegion, targetRegion }) {
//   const skipMissing = process.env.MIGRATE_SKIP_MISSING === "true";

//   console.log(`\n▶ ${tableName}`);

//   let lastKey;
//   let migrated = 0;

//   try {
//     do {
//       const { Items = [], LastEvaluatedKey } = await sourceDoc.send(
//         new ScanCommand({
//           TableName: tableName,
//           ExclusiveStartKey: lastKey,
//         })
//       );

//       if (Items.length > 0) {
//         await batchWriteAll(targetDoc, tableName, Items);
//         migrated += Items.length;
//         process.stdout.write(`  … ${migrated} item(s)\r`);
//       }

//       lastKey = LastEvaluatedKey;
//     } while (lastKey);
//   } catch (err) {
//     if (skipMissing && err.name === "ResourceNotFoundException") {
//       console.log(`  skipped (not found in ${sourceRegion})`);
//       return { tableName, migrated: 0, skipped: true, error: null };
//     }
//     console.error(`  failed: ${err.message || err}`);
//     return { tableName, migrated, skipped: false, error: err };
//   }

//   console.log(`  done — ${migrated} item(s) → ${targetRegion}`);
//   return { tableName, migrated, skipped: false, error: null };
// }

// async function migrateAll(tableNames) {
//   const sourceRegion =
//     process.env.MIGRATE_SOURCE_REGION || process.env.AWS_REGION || "us-east-1";
//   const targetRegion = process.env.MIGRATE_TARGET_REGION || "ap-south-1";

//   const sourceDoc = createDocClient(sourceRegion);
//   const targetDoc = createDocClient(targetRegion);

//   console.log(`Migrating ${tableNames.length} table(s)`);
//   console.log(`  ${sourceRegion} → ${targetRegion}`);
//   console.log(`  Tables: ${tableNames.join(", ")}`);

//   const results = [];
//   for (const tableName of tableNames) {
//     results.push(
//       await migrateTable(sourceDoc, targetDoc, tableName, { sourceRegion, targetRegion })
//     );
//   }

//   const ok = results.filter((r) => !r.error && !r.skipped);
//   const skipped = results.filter((r) => r.skipped);
//   const failed = results.filter((r) => r.error);
//   const totalItems = ok.reduce((n, r) => n + r.migrated, 0);

//   console.log("\n——— Summary ———");
//   console.log(`  Success: ${ok.length} table(s), ${totalItems} item(s) copied`);
//   if (skipped.length) {
//     console.log(`  Skipped: ${skipped.map((r) => r.tableName).join(", ")}`);
//   }
//   if (failed.length) {
//     console.log(`  Failed:  ${failed.map((r) => r.tableName).join(", ")}`);
//     process.exitCode = 1;
//   } else {
//     console.log("  All migrations finished.");
//   }
// }

// function parseArgs(argv) {
//   const args = argv.slice(2);
//   if (args.includes("--list") || args.includes("-l")) {
//     return { mode: "list" };
//   }
//   if (args.includes("--all") || args.length === 0) {
//     return { mode: "all" };
//   }
//   const table = args.find((a) => !a.startsWith("-"));
//   if (table) return { mode: "single", tableName: table };
//   return { mode: "all" };
// }

// async function main() {
//   const parsed = parseArgs(process.argv);
//   const allTables = discoverTableNames();

//   if (allTables.length === 0) {
//     console.error("No tables found under Backend/tables/");
//     process.exit(1);
//   }

//   if (parsed.mode === "list") {
//     console.log("Tables defined in Backend/tables/:");
//     for (const name of allTables) console.log(`  - ${name}`);
//     return;
//   }

//   if (parsed.mode === "single") {
//     const sourceRegion =
//       process.env.MIGRATE_SOURCE_REGION || process.env.AWS_REGION || "us-east-1";
//     const targetRegion = process.env.MIGRATE_TARGET_REGION || "ap-south-1";
//     const sourceDoc = createDocClient(sourceRegion);
//     const targetDoc = createDocClient(targetRegion);
//     const result = await migrateTable(sourceDoc, targetDoc, parsed.tableName, {
//       sourceRegion,
//       targetRegion,
//     });
//     if (result.error) process.exit(1);
//     return;
//   }

//   await migrateAll(allTables);
// }

// main().catch((err) => {
//   console.error("Migration failed:", err.message || err);
//   process.exit(1);
// });
