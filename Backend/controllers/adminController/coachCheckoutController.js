const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  lookupClientByReferralCode,
  listCheckoutStaff,
  listRecentPwc,
  triggerCoachCheckout,
} = require("../../services/coachCheckoutService");

exports.lookupCoachCheckoutClientController = asyncHandler(async (req, res) => {
  const code = req.query.code || req.query.referralCode || req.query.referral_code;
  const client = await lookupClientByReferralCode(code);
  return res.status(200).json({
    status: true,
    message: "Client loaded",
    client,
  });
});

exports.listCoachCheckoutStaffController = asyncHandler(async (_req, res) => {
  const staff = await listCheckoutStaff();
  return res.status(200).json({
    status: true,
    message: "Checkout staff fetched",
    ...staff,
  });
});

exports.listRecentPwcController = asyncHandler(async (req, res) => {
  const items = await listRecentPwc({
    coachId: req.query.coachId || req.query.coach_id || "",
    hours: Number(req.query.hours) || 24,
  });
  return res.status(200).json({
    status: true,
    message: "Recent PWC completions fetched",
    items,
  });
});

exports.triggerCoachCheckoutController = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const userId = String(body.userId || body.user_id || "").trim();
  const productType = String(body.productType || body.product_type || "program").trim();
  const itemId = String(body.itemId || body.item_id || "").trim();
  if (!userId) throw new AppError("userId is required", 400);
  if (!itemId) throw new AppError("itemId is required", 400);

  const result = await triggerCoachCheckout({
    userId,
    productType,
    itemId,
    discountPercent: body.discountPercent ?? body.discount_percent ?? body.discount?.pct,
    discountLabel: body.discountLabel ?? body.discount_label ?? body.discount?.label,
    linkValidity: body.linkValidity ?? body.link_validity,
    appHealValidity: body.appHealValidity ?? body.app_heal_validity,
    wellnessCoachId: body.wellnessCoachId ?? body.wellness_coach_id,
    assistantCoachId: body.assistantCoachId ?? body.assistant_coach_id,
  });

  return res.status(201).json({
    status: true,
    message: `${result.offer.itemName} triggered in app`,
    ...result,
  });
});
