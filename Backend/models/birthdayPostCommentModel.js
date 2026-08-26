const {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const { docClient } = require("../config/db");
const { listByPartitionKey, sortByCreatedAtDesc } = require("../utils/dynamoList");
const { toPublicUser, getUserById } = require("./userModel");

const TABLE = "BirthdayPostComment";

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

async function toPublicComment(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  const commenter = await getUserById(row.commenterUserId);
  return {
    ...row,
    commenter: commenter ? toPublicUser(commenter) : null,
  };
}

async function findBirthdayPostCommentByUser(birthdayPostId, commenterUserId) {
  const postId = String(birthdayPostId || "").trim();
  const uid = String(commenterUserId || "").trim();
  if (!postId || !uid) return null;

  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "BirthdayPostCreatedAtIndex",
        KeyConditionExpression: "birthdayPostId = :birthdayPostId",
        FilterExpression: "commenterUserId = :commenterUserId",
        ExpressionAttributeValues: {
          ":birthdayPostId": postId,
          ":commenterUserId": uid,
        },
        Limit: 25,
        ExclusiveStartKey: lastKey,
      })
    );
    if (Items?.length) return withLegacyId(Items[0]);
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return null;
}

async function createBirthdayPostComment({ birthdayPostId, commenterUserId, comment }) {
  const postId = String(birthdayPostId || "").trim();
  const uid = String(commenterUserId || "").trim();
  const text = String(comment || "").trim();

  if (!postId) throw new Error("birthdayPostId is required");
  if (!uid) throw new Error("commenterUserId is required");
  if (!text) throw new Error("comment is required");
  if (text.length > 2000) throw new Error("comment cannot exceed 2000 characters");

  const existing = await findBirthdayPostCommentByUser(postId, uid);
  if (existing) {
    const err = new Error("You have already commented on this birthday post");
    err.code = "ALREADY_COMMENTED";
    throw err;
  }

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    birthdayPostId: postId,
    commenterUserId: uid,
    comment: text,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  return toPublicComment(item);
}

async function getBirthdayPostCommentRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getBirthdayPostCommentById(id) {
  const item = await getBirthdayPostCommentRecordById(id);
  return item ? toPublicComment(item) : null;
}

async function updateBirthdayPostComment(id, { comment } = {}) {
  const text = String(comment || "").trim();
  if (!text) throw new Error("comment is required");
  if (text.length > 2000) throw new Error("comment cannot exceed 2000 characters");

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: "SET #comment = :comment, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#comment": "comment" },
      ExpressionAttributeValues: {
        ":comment": text,
        ":updatedAt": new Date().toISOString(),
      },
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return toPublicComment(Attributes || null);
}

async function deleteBirthdayPostComment(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listBirthdayPostComments({ birthdayPostId, page = 1, limit = 50 } = {}) {
  const postId = String(birthdayPostId || "").trim();
  if (!postId) {
    return {
      comments: [],
      pagination: { page: 1, limit, total: 0, pages: 1 },
    };
  }

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "BirthdayPostCreatedAtIndex",
    partitionKeyName: "birthdayPostId",
    partitionKeyValue: postId,
    scanIndexForward: true,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });

  const comments = await Promise.all(items.map((row) => toPublicComment(row)));

  return { comments, pagination };
}

async function countCommentsForPost(birthdayPostId) {
  const postId = String(birthdayPostId || "").trim();
  if (!postId) return 0;

  let total = 0;
  let lastKey;

  do {
    const { Count, LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "BirthdayPostCreatedAtIndex",
        KeyConditionExpression: "birthdayPostId = :birthdayPostId",
        ExpressionAttributeValues: { ":birthdayPostId": postId },
        Select: "COUNT",
        ExclusiveStartKey: lastKey,
      })
    );
    total += Count || 0;
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return total;
}

module.exports = {
  createBirthdayPostComment,
  findBirthdayPostCommentByUser,
  getBirthdayPostCommentById,
  getBirthdayPostCommentRecordById,
  updateBirthdayPostComment,
  deleteBirthdayPostComment,
  listBirthdayPostComments,
  countCommentsForPost,
};
