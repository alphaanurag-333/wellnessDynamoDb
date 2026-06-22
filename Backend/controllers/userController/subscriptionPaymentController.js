const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  previewSubscriptionCheckout,
  createSubscriptionOrder,
  verifySubscriptionPayment,
} = require("../../services/subscriptionPaymentService");
const {
  getConsultancyTransactionById,
  listTransactionsByUserId,
  toPublicTransaction,
} = require("../../models/consultancyTransactionModel");
const { isConsultancyOnlyTier } = require("../../models/userAssignmentLogic");
const { getUserById } = require("../../models/userModel");

function mapCheckoutError(err) {
  if (err?.name === "ConsultancyRequiredError") throw new AppError(err.message, 403);
  if (err?.name === "AlreadyConvertedError") throw new AppError(err.message, 409);
  if (err?.name === "ValidationError") throw new AppError(err.message, 400);
  if (err?.name === "ConfigNotFoundError") throw new AppError(err.message, 500);
  if (err?.name === "PaymentGatewayError") throw new AppError(err.message, 502);
  throw err;
}

exports.getSubscriptionCheckoutPreviewController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  if (!isConsultancyOnlyTier(user.userTier)) {
    throw new AppError("Consultancy payment must be completed before subscription checkout", 403);
  }

  try {
    const data = await previewSubscriptionCheckout();
    return res.status(200).json({
      status: true,
      message: "Subscription checkout preview fetched",
      data,
    });
  } catch (err) {
    mapCheckoutError(err);
  }
});

exports.createSubscriptionOrderController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const paymentMethod = req.body?.paymentMethod ?? req.body?.payment_method ?? "upi";

  let result;
  try {
    result = await createSubscriptionOrder(userId, { paymentMethod });
  } catch (err) {
    mapCheckoutError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Subscription payment order created",
    data: result,
  });
});

exports.verifySubscriptionPaymentController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const transactionId = req.body?.transactionId ?? req.body?.transaction_id;
  if (!transactionId) throw new AppError("transactionId is required", 400);

  let transaction;
  try {
    transaction = await verifySubscriptionPayment(userId, {
      transactionId,
      razorpay_order_id: req.body?.razorpay_order_id ?? req.body?.orderId,
      razorpay_payment_id: req.body?.razorpay_payment_id ?? req.body?.paymentId,
      razorpay_signature: req.body?.razorpay_signature ?? req.body?.signature,
    });
  } catch (err) {
    if (err?.name === "NotFoundError") throw new AppError("Transaction not found", 404);
    if (err?.name === "ForbiddenError") throw new AppError("Forbidden", 403);
    if (err?.name === "PaymentVerificationError") throw new AppError(err.message, 400);
    mapCheckoutError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Subscription payment verified successfully",
    data: { transaction },
  });
});

exports.listMySubscriptionTransactionsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const { page = 1, limit = 20, paymentStatus } = req.query;
  const result = await listTransactionsByUserId(userId, {
    page,
    limit,
    paymentStatus,
    productType: "subscription",
  });

  return res.status(200).json({
    status: true,
    message: "Subscription transaction history fetched",
    transactions: result.items.map(toPublicTransaction),
    pagination: result.pagination,
  });
});

exports.getMySubscriptionTransactionController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const transaction = await getConsultancyTransactionById(req.params.id);
  if (!transaction) throw new AppError("Transaction not found", 404);
  if (transaction.userId !== userId) throw new AppError("Forbidden", 403);
  if (String(transaction.productType || "").toLowerCase() !== "subscription") {
    throw new AppError("Not a subscription transaction", 404);
  }

  return res.status(200).json({
    status: true,
    message: "Transaction fetched",
    transaction: toPublicTransaction(transaction),
  });
});
