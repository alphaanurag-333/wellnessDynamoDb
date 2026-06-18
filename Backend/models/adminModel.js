const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { client, docClient } = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const { toPublicProfile } = require("../utils/toPublicProfile");
const { normalizeStoredMedia, resolvePublicUrl } = require("../utils/s3");

const TABLE = "Admin";

/** Cached from DescribeTable — null sortKey means single hash key `id`. */
let tableKeyMeta = null;

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function normalizeProfileImageField(value) {
  if (value == null || String(value).trim() === "") return null;
  const objectKey = normalizeStoredMedia(String(value).trim());
  if (!objectKey) {
    throw new Error("profileImage must be a valid S3 object key (e.g. admin/photo.jpg)");
  }
  return objectKey;
}

function toPublicAdmin(admin) {
  const pub = toPublicProfile(admin);
  if (!pub) return null;
  if (pub.profileImage) pub.profileImage = resolvePublicUrl(pub.profileImage);
  return pub;
}

async function getAdminTableKeyMeta() {
  if (tableKeyMeta) return tableKeyMeta;

  const { Table } = await client.send(new DescribeTableCommand({ TableName: TABLE }));
  const range = Table.KeySchema.find((entry) => entry.KeyType === "RANGE");

  tableKeyMeta = {
    sortKey: range?.AttributeName || null,
  };

  return tableKeyMeta;
}

function buildAdminKey(item, sortKey) {
  const key = { id: item.id };
  if (sortKey && item[sortKey] != null) {
    key[sortKey] = item[sortKey];
  }
  return key;
}

async function getAdminKeyById(id) {
  const { sortKey } = await getAdminTableKeyMeta();

  if (!sortKey) {
    const { Item } = await docClient.send(
      new GetCommand({
        TableName: TABLE,
        Key: { id },
      })
    );
    return Item ? { id: Item.id } : null;
  }

  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: { ":id": id },
      ScanIndexForward: false,
      Limit: 1,
    })
  );

  const item = Items?.[0] || null;
  if (!item) return null;

  return buildAdminKey(item, sortKey);
}

async function createAdmin({ name, email, password, phone = null, profileImage = null, status = "active" }) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    name: name.trim(),
    email: normalizeEmail(email),
    password,
    phone: phone ? phone.trim() : null,
    profileImage: profileImage != null ? normalizeProfileImageField(profileImage) : null,
    resetPasswordToken: null,
    resetPasswordExpire: null,
    status,
    createdAt: now,
    updatedAt: now,
  };

  const { sortKey } = await getAdminTableKeyMeta();
  const condition = sortKey
    ? "attribute_not_exists(id) AND attribute_not_exists(#sk)"
    : "attribute_not_exists(id)";

  const putParams = {
    TableName: TABLE,
    Item: item,
    ConditionExpression: condition,
  };

  if (sortKey) {
    putParams.ExpressionAttributeNames = { "#sk": sortKey };
  }

  await docClient.send(new PutCommand(putParams));

  return item;
}

async function getAdminById(id) {
  const key = await getAdminKeyById(id);
  if (!key) return null;

  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: key,
    })
  );
  return Item || null;
}

async function getAdminByEmail(email) {
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "EmailIndex",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: { ":email": normalizeEmail(email) },
    })
  );
  return Items[0] || null;
}

async function updateAdmin(id, updates) {
  if (!updates || typeof updates !== "object") {
    throw new Error("updates must be a non-null object");
  }

  const allowedUpdates = Object.entries(updates).filter(([, value]) => value !== undefined);
  if (allowedUpdates.length === 0) {
    throw new Error("No valid fields provided for update");
  }

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [key, val] of allowedUpdates) {
    const k = `#${key}`;
    const v = `:${key}`;
    exprNames[k] = key;
    exprValues[v] = key === "profileImage" ? normalizeProfileImageField(val) : val;
    setExpr += `, ${k} = ${v}`;
  }

  const key = await getAdminKeyById(id);
  if (!key) {
    const err = new Error("Admin not found");
    err.name = "NotFoundError";
    throw err;
  }

  const { sortKey } = await getAdminTableKeyMeta();
  const condition = sortKey
    ? "attribute_exists(id) AND attribute_exists(#sk)"
    : "attribute_exists(id)";

  const updateParams = {
    TableName: TABLE,
    Key: key,
    UpdateExpression: setExpr,
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: exprValues,
    ConditionExpression: condition,
    ReturnValues: "ALL_NEW",
  };

  if (sortKey) {
    updateParams.ExpressionAttributeNames["#sk"] = sortKey;
  }

  const { Attributes } = await docClient.send(new UpdateCommand(updateParams));

  return Attributes;
}

async function setResetToken(id, token, expireMs = 3600000) {
  return updateAdmin(id, {
    resetPasswordToken: token,
    resetPasswordExpire: new Date(Date.now() + expireMs).toISOString(),
  });
}

async function clearResetToken(id) {
  return updateAdmin(id, {
    resetPasswordToken: null,
    resetPasswordExpire: null,
  });
}

async function deleteAdmin(id) {
  const key = await getAdminKeyById(id);
  if (!key) {
    const err = new Error("Admin not found");
    err.name = "NotFoundError";
    throw err;
  }

  const { sortKey } = await getAdminTableKeyMeta();
  const condition = sortKey
    ? "attribute_exists(id) AND attribute_exists(#sk)"
    : "attribute_exists(id)";

  const deleteParams = {
    TableName: TABLE,
    Key: key,
    ConditionExpression: condition,
  };

  if (sortKey) {
    deleteParams.ExpressionAttributeNames = { "#sk": sortKey };
  }

  await docClient.send(new DeleteCommand(deleteParams));
  return { deleted: true };
}

module.exports = {
  createAdmin,
  getAdminById,
  getAdminByEmail,
  updateAdmin,
  setResetToken,
  clearResetToken,
  deleteAdmin,
  toPublicAdmin,
  getAdminTableKeyMeta,
};
