const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById } = require("../../models/userModel");
const {
  getEnabledProgramForUser,
  toPublicProgram,
} = require("../../models/energyExchangeProgramModel");
const {
  buildFyPlansForUser,
} = require("../../services/energyExchangePricingService");
const {
  previewEnergyExchangeCheckout,
  createEnergyExchangeOrder,
  verifyEnergyExchangePayment,
  listSubscriptionsForUserPublic,
} = require("../../services/energyExchangePaymentService");

function mapCheckoutError(err) {
  if (err?.name === "ConsultancyRequiredError") throw new AppError(err.message, 403);
  if (err?.name === "ProgramRequiredError") throw new AppError(err.message, 403);
  if (err?.name === "AlreadyConvertedError") throw new AppError(err.message, 409);
  if (err?.name === "ValidationError") throw new AppError(err.message, 400);
  if (err?.name === "ForbiddenError") throw new AppError(err.message, 403);
  if (err?.name === "NotFoundError") throw new AppError(err.message, 404);
  if (err?.name === "ConfigNotFoundError") throw new AppError(err.message, 500);
  if (err?.name === "PaymentGatewayError") throw new AppError(err.message, 502);
  throw err;
}

function parseFyStartYears(body) {
  const raw = body?.fyStartYears ?? body?.fy_start_years;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(Number).filter((n) => Number.isFinite(n));
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(Number).filter((n) => Number.isFinite(n));
    } catch {
      return raw.split(",").map((v) => Number(String(v).trim())).filter((n) => Number.isFinite(n));
    }
  }
  return [];
}

exports.getProgramForUserController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const user = await getUserById(userId);
  const program = await getEnabledProgramForUser(userId);
  if (!program) {
    return res.status(200).json({
      status: true,
      message: "No Energy Exchange program available",
      enabled: false,
      program: null,
      programPurchased: Boolean(user?.programPurchased),
    });
  }
  return res.status(200).json({
    status: true,
    message: "Energy Exchange program fetched",
    enabled: Boolean(program.enabled),
    program: toPublicProgram(program),
    programPurchased: Boolean(user?.programPurchased),
  });
});

exports.listPlansController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const user = await getUserById(userId);
  const { plans, currentFy, fyStartMonth, program } = await buildFyPlansForUser(userId);
  if (!program) {
    return res.status(200).json({
      status: true,
      message: "Energy Exchange not configured",
      plans: [],
      enabled: false,
      currentFy: null,
      fyStartMonth,
      programPurchased: Boolean(user?.programPurchased),
    });
  }
  return res.status(200).json({
    status: true,
    message: "Energy Exchange plans fetched",
    enabled: Boolean(program.enabled),
    program: toPublicProgram(program),
    plans,
    currentFy,
    fyStartMonth,
    programPurchased: Boolean(user?.programPurchased),
  });
});

exports.previewOrderController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const fyStartYears = parseFyStartYears(req.body);
  if (!fyStartYears.length) throw new AppError("fyStartYears is required", 400);

  let preview;
  try {
    preview = await previewEnergyExchangeCheckout(userId, { fyStartYears });
  } catch (err) {
    mapCheckoutError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Energy Exchange checkout preview",
    data: preview,
  });
});

exports.createOrderController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const fyStartYears = parseFyStartYears(req.body);
  if (!fyStartYears.length) throw new AppError("fyStartYears is required", 400);
  const paymentMethod = req.body?.paymentMethod ?? req.body?.payment_method ?? "upi";

  let result;
  try {
    result = await createEnergyExchangeOrder(userId, { fyStartYears, paymentMethod });
  } catch (err) {
    mapCheckoutError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Energy Exchange payment order created",
    data: result,
  });
});

exports.verifyPaymentController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const transactionId = req.body?.transactionId ?? req.body?.transaction_id;
  if (!transactionId) throw new AppError("transactionId is required", 400);

  let transaction;
  try {
    transaction = await verifyEnergyExchangePayment(userId, {
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
    message: "Energy Exchange payment verified successfully",
    data: { transaction },
  });
});

exports.listSubscriptionsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const subscriptions = await listSubscriptionsForUserPublic(userId);

  const grouped = {
    active: subscriptions.filter((s) => s.status === "active"),
    queued: subscriptions.filter((s) => s.status === "queued"),
    expired: subscriptions.filter((s) => s.status === "expired"),
    pending: subscriptions.filter((s) => s.status === "pending"),
    refunded: subscriptions.filter((s) => s.status === "refunded"),
  };

  const user = await getUserById(userId);
  return res.status(200).json({
    status: true,
    message: "Energy Exchange subscriptions fetched",
    subscriptions,
    grouped,
    healPaidAt: user?.healPaidAt || null,
  });
});
