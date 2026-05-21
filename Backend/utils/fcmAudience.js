const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

const AUDIENCE_TABLES = {
  users: ["User"],
  coaches: ["WellnessCoach", "AssistantWellnessCoach"],
};

async function scanActiveFcmTokens(tableName) {
  const tokens = [];
  let lastKey;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "#status = :active AND attribute_exists(fcm_id)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":active": "active" },
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of Items || []) {
      const token = String(item.fcm_id || "").trim();
      if (token) tokens.push(token);
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return tokens;
}

async function collectFcmTokensForAudience(audienceType) {
  const tables = AUDIENCE_TABLES[audienceType];
  if (!tables) return [];

  const merged = [];
  for (const tableName of tables) {
    const rows = await scanActiveFcmTokens(tableName);
    merged.push(...rows);
  }
  return [...new Set(merged)];
}

module.exports = {
  collectFcmTokensForAudience,
};
