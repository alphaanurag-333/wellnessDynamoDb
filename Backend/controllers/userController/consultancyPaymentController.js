const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { resolvePublicUrl } = require("../../utils/s3");
const { sendConsultancyInvoicePdf } = require("../../utils/consultancyInvoiceResponse");
const {
  previewCheckout,
  createConsultancyOrder,
  verifyConsultancyPayment,
} = require("../../services/consultancyPaymentService");
const { parseHealthConcernIdFromBody } = require("../../services/consultancyHealthConcern");
const {
  getConsultancyTransactionById,
  listTransactionsByUserId,
  toPublicTransaction,
} = require("../../models/consultancyTransactionModel");

function mapCheckoutError(err) {
  if (err?.name === "InvalidReferralCodeError") throw new AppError(err.message, 400);
  if (err?.name === "ValidationError") throw new AppError(err.message, 400);
  if (err?.name === "ConfigNotFoundError") throw new AppError(err.message, 500);
  if (err?.name === "PaymentGatewayError") throw new AppError(err.message, 502);
  throw err;
}

function enrichTransactionPublic(item) {
  const pub = toPublicTransaction(item);
  if (pub?.invoicePdfKey) pub.invoiceUrl = resolvePublicUrl(pub.invoicePdfKey);
  return pub;
}

exports.getCheckoutPreviewController = asyncHandler(async (req, res) => {
  const referralCode = req.query.referralCode ?? req.query.referral_code ?? null;
  try {
    const data = await previewCheckout({ referralCode });
    return res.status(200).json({
      status: true,
      message: "Checkout preview fetched",
      data,
    });
  } catch (err) {
    mapCheckoutError(err);
  }
});

exports.createConsultancyOrderController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const referralCode = req.body?.referralCode ?? req.body?.referral_code ?? null;
  const paymentMethod = req.body?.paymentMethod ?? req.body?.payment_method ?? "upi";
  const healthConcernId = parseHealthConcernIdFromBody(req.body);

  let result;
  try {
    result = await createConsultancyOrder(userId, { referralCode, paymentMethod, healthConcernId });
  } catch (err) {
    mapCheckoutError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Consultancy payment order created",
    data: result,
  });
});

exports.verifyConsultancyPaymentController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const transactionId = req.body?.transactionId ?? req.body?.transaction_id;
  if (!transactionId) throw new AppError("transactionId is required", 400);

  let transaction;
  try {
    transaction = await verifyConsultancyPayment(userId, {
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
    message: "Payment verified successfully",
    data: { transaction },
  });
});

exports.listMyConsultancyTransactionsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const { page = 1, limit = 20, paymentStatus } = req.query;
  const result = await listTransactionsByUserId(userId, { page, limit, paymentStatus });

  return res.status(200).json({
    status: true,
    message: "Transaction history fetched",
    transactions: result.items.map(enrichTransactionPublic),
    pagination: result.pagination,
  });
});

exports.getMyConsultancyTransactionController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const transaction = await getConsultancyTransactionById(req.params.id);
  if (!transaction) throw new AppError("Transaction not found", 404);
  if (transaction.userId !== userId) throw new AppError("Forbidden", 403);

  return res.status(200).json({
    status: true,
    message: "Transaction fetched",
    transaction: enrichTransactionPublic(transaction),
  });
});

exports.getMyConsultancyInvoiceController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const transaction = await getConsultancyTransactionById(req.params.id);
  if (!transaction) throw new AppError("Transaction not found", 404);
  if (transaction.userId !== userId) throw new AppError("Forbidden", 403);
  if (String(transaction.paymentStatus || "").toLowerCase() !== "paid") {
    throw new AppError("Invoice not available", 404);
  }
  await sendConsultancyInvoicePdf(res, transaction);
});
