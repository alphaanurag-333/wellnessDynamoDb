const { normalizeMediaItemFromStorage } = require("../../utils/mediaFieldAliases");
const { getTableDefinition, getGsiHashKeys } = require("./tableSchemas");

const MEDIA_TABLES = new Set(["ClientTestimonials", "VideoTestimonials", "HealthRecipe"]);

function sanitizeItemForRestore(tableName, item) {
  if (!item || typeof item !== "object") return item;

  let row = { ...item };

  if (MEDIA_TABLES.has(tableName)) {
    row = normalizeMediaItemFromStorage(row) || row;
  }

  if (tableName === "AppConfig") {
    delete row.payment_methods;
  }

  if (tableName === "User" && !row.userTier) {
    row.userTier = "seek";
  }

  const definition = getTableDefinition(tableName);
  for (const key of getGsiHashKeys(definition)) {
    if (row[key] == null || row[key] === "") {
      delete row[key];
    }
  }

  return row;
}

function sanitizeItemsForRestore(tableName, items) {
  return items.map((item) => sanitizeItemForRestore(tableName, item));
}

module.exports = {
  sanitizeItemForRestore,
  sanitizeItemsForRestore,
};
