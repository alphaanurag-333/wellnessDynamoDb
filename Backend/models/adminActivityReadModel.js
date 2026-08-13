const { PutCommand, BatchGetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

const TABLE = "AdminActivityRead";
const BATCH_GET_SIZE = 100;

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function markActivityRead(accountId, activityId) {
  const aid = String(accountId || "").trim();
  const nid = String(activityId || "").trim();
  if (!aid || !nid) throw new Error("accountId and activityId are required");

  const now = new Date().toISOString();
  const item = {
    accountId: aid,
    activityId: nid,
    readAt: now,
    createdAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
    })
  );

  return item;
}

async function markAllActivitiesRead(accountId, activityIds) {
  const aid = String(accountId || "").trim();
  const ids = [...new Set((activityIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (!aid || ids.length === 0) return [];

  const results = [];
  for (const activityId of ids) {
    results.push(await markActivityRead(aid, activityId));
  }
  return results;
}

async function getReadMapForAccount(accountId, activityIds) {
  const aid = String(accountId || "").trim();
  const ids = [...new Set((activityIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const map = new Map();
  if (!aid || ids.length === 0) return map;

  for (const chunk of chunkArray(ids, BATCH_GET_SIZE)) {
    let requestKeys = chunk.map((activityId) => ({ accountId: aid, activityId }));

    while (requestKeys.length > 0) {
      const { Responses, UnprocessedKeys } = await docClient.send(
        new BatchGetCommand({
          RequestItems: {
            [TABLE]: { Keys: requestKeys },
          },
        })
      );

      for (const item of Responses?.[TABLE] || []) {
        map.set(item.activityId, item.readAt || null);
      }

      requestKeys = UnprocessedKeys?.[TABLE]?.Keys || [];
      if (requestKeys.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  return map;
}

async function listReadActivityIdsForAccount(accountId) {
  const aid = String(accountId || "").trim();
  if (!aid) return new Set();

  const ids = new Set();
  let lastKey;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "accountId = :accountId",
        ExpressionAttributeValues: { ":accountId": aid },
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of Items || []) {
      if (item.activityId) ids.add(item.activityId);
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return ids;
}

module.exports = {
  markActivityRead,
  markAllActivitiesRead,
  getReadMapForAccount,
  listReadActivityIdsForAccount,
};
