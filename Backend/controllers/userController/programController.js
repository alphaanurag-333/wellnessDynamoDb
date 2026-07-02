const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById } = require("../../models/userModel");
const {
  getActiveProgramForUser,
  toPublicUserProgram,
} = require("../../models/userProgramModel");
const {
  previewProgramCheckout,
  createProgramOrder,
  verifyProgramPayment,
} = require("../../services/programPaymentService");

function mapCheckoutError(err) {
  if (err?.name === "ConsultancyRequiredError") throw new AppError(err.message, 403);
  if (err?.name === "AlreadyPurchasedError") throw new AppError(err.message, 409);
  if (err?.name === "ProgramRequiredError") throw new AppError(err.message, 403);
  if (err?.name === "ValidationError") throw new AppError(err.message, 400);
  if (err?.name === "ForbiddenError") throw new AppError(err.message, 403);
  if (err?.name === "NotFoundError") throw new AppError(err.message, 404);
  if (err?.name === "ConfigNotFoundError") throw new AppError(err.message, 500);
  if (err?.name === "PaymentGatewayError") throw new AppError(err.message, 502);
  throw err;
}

exports.getProgramForUserController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const user = await getUserById(userId);
  const program = await getActiveProgramForUser(userId);

  if (!program) {
    return res.status(200).json({
      status: true,
      message: "No Wellness Program assigned",
      enabled: false,
      program: null,
      programPurchased: Boolean(user?.programPurchased),
      programPurchasedAt: user?.programPurchasedAt || null,
    });
  }

  return res.status(200).json({
    status: true,
    message: "Wellness Program fetched",
    enabled: Boolean(program.enabled) && !user?.programPurchased,
    program: toPublicUserProgram(program),
    programPurchased: Boolean(user?.programPurchased),
    programPurchasedAt: user?.programPurchasedAt || null,
  });
});

exports.previewOrderController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;

  let preview;
  try {
    preview = await previewProgramCheckout(userId);
  } catch (err) {
    mapCheckoutError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Program checkout preview",
    data: preview,
  });
});

exports.createOrderController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const paymentMethod = req.body?.paymentMethod ?? req.body?.payment_method ?? "upi";

  let result;
  try {
    result = await createProgramOrder(userId, { paymentMethod });
  } catch (err) {
    mapCheckoutError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Program payment order created",
    data: result,
  });
});

exports.verifyPaymentController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const transactionId = req.body?.transactionId ?? req.body?.transaction_id;
  if (!transactionId) throw new AppError("transactionId is required", 400);

  let transaction;
  try {
    transaction = await verifyProgramPayment(userId, {
      transactionId,
      razorpay_order_id: req.body?.razorpay_order_id ?? req.body?.orderId,
      razorpay_payment_id: req.body?.razorpay_payment_id ?? req.body?.paymentId,
      razorpay_signature: req.body?.razorpay_signature ?? req.body?.signature,
    });
  } catch (err) {
    if (err?.name === "PaymentVerificationError") throw new AppError(err.message, 400);
    mapCheckoutError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Program payment verified successfully",
    data: { transaction },
  });
});
