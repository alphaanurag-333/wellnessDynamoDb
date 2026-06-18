/**
 * Rename legacy snake_case media attributes to camelCase in DynamoDB:
 *   profile_image → profileImage (ClientTestimonials, VideoTestimonials)
 *   video_specification → videoSpecification (HealthRecipe)
 */
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../../config/db");
const { backupTable, scanTable } = require("../lib/helpers");

const TABLES = [
  {
    name: "ClientTestimonials",
    migrate(item) {
      if (!item.profile_image) return null;
      return {
        set: { profileImage: item.profile_image },
        remove: ["profile_image"],
      };
    },
  },
  {
    name: "VideoTestimonials",
    migrate(item) {
      if (!item.profile_image) return null;
      return {
        set: { profileImage: item.profile_image },
        remove: ["profile_image"],
      };
    },
  },
  {
    name: "HealthRecipe",
    migrate(item) {
      if (item.video_specification === undefined) return null;
      return {
        set: { videoSpecification: item.video_specification },
        remove: ["video_specification"],
      };
    },
  },
];

async function migrateTable({ name, migrate }) {
  console.log(`[${name}] Scanning for legacy media attributes...`);
  const items = await scanTable(name);
  const pending = items.map((item) => ({ id: item.id, patch: migrate(item) })).filter((x) => x.patch);

  if (pending.length === 0) {
    console.log(`[${name}] No legacy media fields — skip.`);
    return { table: name, updated: 0 };
  }

  await backupTable(name);

  for (const { id, patch } of pending) {
    const exprNames = {};
    const exprValues = {};
    const setParts = [];
    for (const [key, val] of Object.entries(patch.set)) {
      exprNames[`#${key}`] = key;
      exprValues[`:${key}`] = val;
      setParts.push(`#${key} = :${key}`);
    }

    await docClient.send(
      new UpdateCommand({
        TableName: name,
        Key: { id },
        UpdateExpression: `SET ${setParts.join(", ")} REMOVE ${patch.remove.join(", ")}`,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
      })
    );
    console.log(`  Migrated ${id}`);
  }

  console.log(`[${name}] Updated ${pending.length} item(s).`);
  return { table: name, updated: pending.length };
}

async function migrateMediaFieldCamelCase() {
  const results = [];
  for (const table of TABLES) {
    results.push(await migrateTable(table));
  }
  return results;
}

module.exports = { id: "04-media-field-camelcase", TABLES, migrateMediaFieldCamelCase };
