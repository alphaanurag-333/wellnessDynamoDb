const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listPublishedChallenges,
  getChallengeById,
} = require("../../models/challengeModel");
const {
  listEnrollmentsByUserId,
} = require("../../models/challengeEnrollmentModel");
const {
  previewChallengeCheckout,
  createChallengeOrder,
  verifyChallengePayment,
} = require("../../services/challengePaymentService");
const {
  getCouponByCode,
  couponAppliesToChallenge,
  normalizeCouponCode,
} = require("../../models/couponModel");
const {
  getSectionSurfaceConfig,
} = require("../../models/sectionSurfaceConfigModel");

async function isChallengesAppEnabled() {
  const config = await getSectionSurfaceConfig("challenges");
  if (!config) return true;
  return config.appOn !== false;
}

exports.listPublishedChallengesController = asyncHandler(async (req, res) => {
  if (!(await isChallengesAppEnabled())) {
    return res.status(200).json({
      status: true,
      challenges: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 0 },
      appEnabled: false,
    });
  }
  const data = await listPublishedChallenges({
    page: req.query.page || 1,
    limit: req.query.limit || 50,
  });
  return res.status(200).json({
    status: true,
    challenges: data.challenges,
    pagination: data.pagination,
    appEnabled: true,
  });
});

exports.getPublishedChallengeController = asyncHandler(async (req, res) => {
  if (!(await isChallengesAppEnabled())) {
    throw new AppError("Challenges are currently unavailable", 404);
  }
  const challenge = await getChallengeById(req.params.id);
  if (!challenge || challenge.status !== "published") {
    throw new AppError("Challenge not found", 404);
  }
  return res.status(200).json({ status: true, challenge });
});

exports.listMyChallengeEnrollmentsController = asyncHandler(async (req, res) => {
  const data = await listEnrollmentsByUserId(req.user.id, {
    page: req.query.page || 1,
    limit: req.query.limit || 50,
    status: req.query.status,
  });
  return res.status(200).json({
    status: true,
    enrollments: data.enrollments,
    pagination: data.pagination,
  });
});

exports.previewChallengePaymentController = asyncHandler(async (req, res) => {
  if (!(await isChallengesAppEnabled())) {
    throw new AppError("Challenges are currently unavailable", 404);
  }
  try {
    const data = await previewChallengeCheckout(req.params.id, {
      couponCode: req.body.couponCode,
    });
    return res.status(200).json({ status: true, data });
  } catch (err) {
    if (err?.name === "NotFoundError") throw new AppError(err.message, 404);
    if (err?.name === "InvalidCouponError") throw new AppError(err.message, 400);
    if (err?.name === "ConfigNotFoundError") throw new AppError(err.message, 500);
    throw err;
  }
});

exports.createChallengeOrderController = asyncHandler(async (req, res) => {
  if (!(await isChallengesAppEnabled())) {
    throw new AppError("Challenges are currently unavailable", 404);
  }
  try {
    const data = await createChallengeOrder(req.user.id, req.params.id, {
      paymentMethod: req.body.paymentMethod || "upi",
      couponCode: req.body.couponCode,
    });
    return res.status(200).json({ status: true, data });
  } catch (err) {
    if (err?.name === "NotFoundError") throw new AppError(err.message, 404);
    if (err?.name === "AlreadyEnrolledError") throw new AppError(err.message, 409);
    if (err?.name === "InvalidCouponError") throw new AppError(err.message, 400);
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }
});

exports.verifyChallengePaymentController = asyncHandler(async (req, res) => {
  try {
    const data = await verifyChallengePayment(req.user.id, {
      transactionId: req.body.transactionId,
      orderId: req.body.orderId ?? req.body.order_id ?? req.body.cashfree_order_id ?? req.body.razorpay_order_id,
      paymentId: req.body.paymentId ?? req.body.payment_id ?? req.body.cashfree_payment_id ?? req.body.razorpay_payment_id,
    });
    return res.status(200).json({ status: true, data });
  } catch (err) {
    if (err?.name === "NotFoundError") throw new AppError(err.message, 404);
    if (err?.name === "PaymentVerificationError") throw new AppError(err.message, 400);
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }
});

exports.validateChallengeCouponController = asyncHandler(async (req, res) => {
  if (!(await isChallengesAppEnabled())) {
    throw new AppError("Challenges are currently unavailable", 404);
  }
  const code = normalizeCouponCode(req.body.couponCode);
  const challengeId = String(req.body.challengeId || req.params.id || "").trim();
  if (!code) throw new AppError("couponCode is required", 400);
  if (!challengeId) throw new AppError("challengeId is required", 400);

  const challenge = await getChallengeById(challengeId);
  if (!challenge || challenge.status !== "published") {
    throw new AppError("Challenge not found", 404);
  }

  const coupon = await getCouponByCode(code);
  if (!couponAppliesToChallenge(coupon, challengeId)) {
    throw new AppError("Invalid or inapplicable coupon code", 400);
  }

  const preview = await previewChallengeCheckout(challengeId, { couponCode: code });
  return res.status(200).json({
    status: true,
    data: {
      couponCode: code,
      valid: true,
      pricing: preview.pricing,
    },
  });
});
