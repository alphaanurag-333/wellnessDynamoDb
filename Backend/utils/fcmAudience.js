const { QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { readFcmToken } = require("./parseFcmId");

const AUDIENCE_TABLES = {
  users: ["User"],
};

async function queryActiveFcmTokens(tableName) {
  const tokens = [];
  let lastKey;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: "StatusCreatedAtIndex",
        KeyConditionExpression: "#status = :active",
        FilterExpression: "attribute_exists(fcmId) OR attribute_exists(fcm_id)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":active": "active" },
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of Items || []) {
      const token = readFcmToken(item);
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
    const rows = await queryActiveFcmTokens(tableName);
    merged.push(...rows);
  }
  return [...new Set(merged)];
}

module.exports = {
  collectFcmTokensForAudience,
  queryActiveFcmTokens,
};
