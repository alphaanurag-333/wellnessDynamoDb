const AppError = require("../../utils/AppError");
const { resolveStaffActor } = require("../staffAccess");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createCoachRecommendedSupplement,
  listCoachRecommendedSupplementsByUserId,
  deleteCoachRecommendedSupplement,
  upsertFulfilmentOrder,
  saveFulfilmentOrderBill,
  deleteFulfilmentOrder,
} = require("../../models/coachRecommendedSupplementModel");
const {
  dispatchSupplementRecommendedNotification,
  dispatchSupplementOrderLoggedNotification,
} = require("../../services/notificationDispatchService");
const { uploadFileFromRequest } = require("../../utils/s3");
const {
  readUserIdParam,
  readRecommendationIdParam,
  parseRecommendationItems,
  parseDeliveryOption,
  buildRecommendationItemSnapshots,
  loadTargetUser,
  assertStaffCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadRecommendationForUser,
} = require("../helpers/supplementControllerHelpers");

const S3_FOLDER = "supplement-fulfilment-bills";
const BILL_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);

function readOrderIdParam(req) {
  return String(req.params.orderId || "").trim();
}

function parseFulfilmentOrderBody(body = {}) {
  let items = body.items;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      items = [];
    }
  }
  return {
    id: String(body.id || body.orderId || "").trim() || undefined,
    items: Array.isArray(items) ? items : [],
    placedOn: body.placedOn,
    vendor: body.vendor,
    tracking: body.tracking,
    expectedDelivery: body.expectedDelivery,
    status: body.status,
    billFileName: body.billFileName,
  };
}

function assertBillUpload(req) {
  if (!req?.file?.buffer) {
    throw new AppError("Bill file is required", 400);
  }
  const mime = String(req.file.mimetype || "").toLowerCase();
  if (!BILL_MIME.has(mime)) {
    throw new AppError("Only PDF or image files are allowed", 400);
  }
}

function handleOrderError(err) {
  if (err?.name === "NotFoundError") {
    throw new AppError(err.message, 404);
  }
  handleValidationError(err);
}

exports.listCoachUserSupplementRecommendationsController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const recommendations = await listCoachRecommendedSupplementsByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Supplement recommendations fetched successfully",
    recommendations,
    recommended: recommendations[0] || null,
    history: recommendations.length > 1 ? recommendations.slice(1) : [],
  });
});

exports.createCoachUserSupplementRecommendationController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const parsedItems = parseRecommendationItems(req.body);
  const deliveryOption = parseDeliveryOption(req.body);
  const items = await buildRecommendationItemSnapshots(parsedItems);

  let recommendation;
  try {
    recommendation = await createCoachRecommendedSupplement({
      userId,
      coachId: resolveCoachIdForUser(user, actingCoachId),
      items,
      deliveryOption,
      createdByRole: req.auth?.role || "wellness_coach",
      createdById: actingCoachId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const coach = { id: actingCoachId, name: resolveStaffActor(req).displayName };
  dispatchSupplementRecommendedNotification({
    userId,
    coachName: coach?.name || "Your coach",
    recommendationId: recommendation?.id,
  }).catch((err) => {
    console.error("Supplement recommendation notification failed:", err?.message || err);
  });

  return res.status(201).json({
    status: true,
    message: "Supplement recommendation created successfully",
    recommendation,
  });
});

exports.deleteCoachUserSupplementRecommendationController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const recommendationId = readRecommendationIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  await loadRecommendationForUser(recommendationId, userId);

  try {
    await deleteCoachRecommendedSupplement(recommendationId);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException" || err?.name === "NotFoundError") {
      throw new AppError("Supplement recommendation not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Supplement recommendation removed successfully",
  });
});

exports.upsertCoachUserSupplementFulfilmentOrderController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const recommendationId = readRecommendationIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  await loadRecommendationForUser(recommendationId, userId);

  const body = parseFulfilmentOrderBody(req.body);
  if (!body.id) {
    const paramOrderId = readOrderIdParam(req);
    if (paramOrderId) body.id = paramOrderId;
  }
  const items = await buildRecommendationItemSnapshots(
    (body.items || []).map((row) => ({
      supplementId: row.supplementId || row.id,
      qty: row.qty,
    }))
  );

  let result;
  try {
    result = await upsertFulfilmentOrder(recommendationId, {
      ...body,
      items,
    });
  } catch (err) {
    handleOrderError(err);
  }

  dispatchSupplementOrderLoggedNotification({
    userId,
    coachName: resolveStaffActor(req).displayName || "Your coach",
    recommendationId,
    orderId: result?.order?.id,
    vendor: result?.order?.vendor,
  }).catch((err) => {
    console.error("Supplement order logged notification failed:", err?.message || err);
  });

  return res.status(200).json({
    status: true,
    message: "Fulfilment order saved successfully",
    order: result.order,
    recommendation: result.recommendation,
  });
});

exports.uploadCoachUserSupplementFulfilmentOrderBillController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const recommendationId = readRecommendationIdParam(req);
  const orderId = readOrderIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  await loadRecommendationForUser(recommendationId, userId);
  assertBillUpload(req);

  const fileKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (!fileKey) {
    throw new AppError("Failed to upload bill", 500);
  }

  let result;
  try {
    result = await saveFulfilmentOrderBill(
      recommendationId,
      orderId,
      fileKey,
      req.file?.originalname || ""
    );
  } catch (err) {
    handleOrderError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Fulfilment order bill uploaded successfully",
    order: result.order,
    recommendation: result.recommendation,
  });
});

exports.deleteCoachUserSupplementFulfilmentOrderController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const recommendationId = readRecommendationIdParam(req);
  const orderId = readOrderIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  await loadRecommendationForUser(recommendationId, userId);

  let recommendation;
  try {
    recommendation = await deleteFulfilmentOrder(recommendationId, orderId);
  } catch (err) {
    handleOrderError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Fulfilment order removed successfully",
    recommendation,
  });
});
