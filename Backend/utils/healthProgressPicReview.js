function resolvePicReviewOnSave({
  picKey,
  previousPicKey,
  existingReviewStatus,
  existingRejectionReason,
  existingReviewedAt,
  existingReviewedById,
}) {
  if (!picKey) {
    return {
      reviewStatus: null,
      rejectionReason: null,
      reviewedAt: null,
      reviewedById: null,
    };
  }

  const samePhoto = Boolean(previousPicKey) && previousPicKey === picKey;
  const reviewStatus = samePhoto ? (existingReviewStatus || "pending") : "pending";

  return {
    reviewStatus,
    rejectionReason: reviewStatus === "rejected" ? (existingRejectionReason || null) : null,
    reviewedAt: samePhoto ? (existingReviewedAt || null) : null,
    reviewedById: samePhoto ? (existingReviewedById || null) : null,
  };
}

async function applyPhotoReviewUpdate({
  getItem,
  picKeyField,
  reviewFields,
  userId,
  logId,
  status,
  reviewedById,
  rejectionReason,
  UpdateCommand,
  docClient,
  tableName,
}) {
  const nextStatus = status === "approved" || status === "rejected" ? status : "";
  if (!nextStatus) {
    const err = new Error("status must be approved or rejected");
    err.name = "ValidationError";
    throw err;
  }

  const item = await getItem(logId);
  if (!item || String(item.userId) !== String(userId)) {
    const err = new Error("Log not found");
    err.name = "NotFoundError";
    throw err;
  }
  if (!item[picKeyField]) {
    const err = new Error("This entry has no photo");
    err.name = "ValidationError";
    throw err;
  }

  const now = new Date().toISOString();
  const reason = nextStatus === "rejected"
    ? String(rejectionReason || "").trim().slice(0, 500) || null
    : null;

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { id: logId },
      UpdateExpression: `SET ${reviewFields.status} = :status, ${reviewFields.reason} = :reason, ${reviewFields.reviewedAt} = :reviewedAt, ${reviewFields.reviewedById} = :reviewedById, updatedAt = :updatedAt`,
      ExpressionAttributeValues: {
        ":status": nextStatus,
        ":reason": reason,
        ":reviewedAt": now,
        ":reviewedById": reviewedById ? String(reviewedById) : null,
        ":updatedAt": now,
      },
      ReturnValues: "ALL_NEW",
    })
  );
  return Attributes;
}

module.exports = {
  resolvePicReviewOnSave,
  applyPhotoReviewUpdate,
};
