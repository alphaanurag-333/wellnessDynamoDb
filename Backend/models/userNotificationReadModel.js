const { PutCommand, BatchGetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

const TABLE = "UserNotificationRead";
const BATCH_GET_SIZE = 100;

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function markNotificationRead(userId, notificationId) {
  const uid = String(userId || "").trim();
  const nid = String(notificationId || "").trim();
  if (!uid || !nid) throw new Error("userId and notificationId are required");

  const now = new Date().toISOString();
  const item = {
    userId: uid,
    notificationId: nid,
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

async function markAllNotificationsRead(userId, notificationIds) {
  const uid = String(userId || "").trim();
  const ids = [...new Set((notificationIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (!uid || ids.length === 0) return [];

  const results = [];
  for (const notificationId of ids) {
    results.push(await markNotificationRead(uid, notificationId));
  }
  return results;
}

async function getReadMapForUser(userId, notificationIds) {
  const uid = String(userId || "").trim();
  const ids = [...new Set((notificationIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const map = new Map();
  if (!uid || ids.length === 0) return map;

  for (const chunk of chunkArray(ids, BATCH_GET_SIZE)) {
    let requestKeys = chunk.map((notificationId) => ({ userId: uid, notificationId }));

    while (requestKeys.length > 0) {
      const { Responses, UnprocessedKeys } = await docClient.send(
        new BatchGetCommand({
          RequestItems: {
            [TABLE]: { Keys: requestKeys },
          },
        })
      );

      for (const item of Responses?.[TABLE] || []) {
        map.set(item.notificationId, item.readAt || null);
      }

      requestKeys = UnprocessedKeys?.[TABLE]?.Keys || [];
      if (requestKeys.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  return map;
}

async function listReadNotificationIdsForUser(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return new Set();

  const ids = new Set();
  let lastKey;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: { ":userId": uid },
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of Items || []) {
      if (item.notificationId) ids.add(item.notificationId);
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return ids;
}

module.exports = {
  markNotificationRead,
  markAllNotificationsRead,
  getReadMapForUser,
  listReadNotificationIdsForUser,
};
