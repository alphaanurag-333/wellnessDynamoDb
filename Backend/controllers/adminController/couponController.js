const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createCoupon,
  getCouponById,
  getCouponByCode,
  updateCoupon,
  deleteCoupon,
  listCoupons,
  normalizeStatus,
  normalizeDiscountType,
  normalizeCouponCode,
  normalizeValue,
  ALLOWED_DISCOUNT_TYPES,
} = require("../../models/couponModel");

exports.listCouponsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 200, status, search } = req.query;

  const data = await listCoupons({ page, limit, status, search });

  return res.status(200).json({
    status: true,
    coupons: data.coupons,
    pagination: data.pagination,
  });
});

exports.getCouponByIdController = asyncHandler(async (req, res) => {
  const coupon = await getCouponById(req.params.id);
  if (!coupon) {
    throw new AppError("Coupon not found", 404);
  }

  return res.status(200).json({
    status: true,
    coupon,
  });
});

exports.createCouponController = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  const status = normalizeStatus(req.body.status, "active");
  const couponCode = normalizeCouponCode(req.body.couponCode);
  const discountType = normalizeDiscountType(req.body.discountType, "percentage");

  if (!title) {
    throw new AppError("title is required", 400);
  }
  if (!couponCode) {
    throw new AppError("couponCode is required", 400);
  }
  if (req.body.value === undefined || req.body.value === null || req.body.value === "") {
    throw new AppError("value is required", 400);
  }

  let value;
  try {
    value = normalizeValue(req.body.value, discountType);
  } catch (err) {
    throw new AppError(err.message, 400);
  }

  let coupon;
  try {
    coupon = await createCoupon({
      title,
      status,
      couponCode,
      discountType,
      value,
    });
  } catch (err) {
    if (err?.code === "DUPLICATE_COUPON_CODE") {
      throw new AppError("coupon code already exists", 409);
    }
    throw err;
  }

  return res.status(201).json({
    status: true,
    message: "Coupon created successfully",
    coupon,
  });
});

exports.updateCouponController = asyncHandler(async (req, res) => {
  const existing = await getCouponById(req.params.id);
  if (!existing) {
    throw new AppError("Coupon not found", 404);
  }

  const updates = {};
  const nextDiscountType = req.body.discountType !== undefined
    ? normalizeDiscountType(req.body.discountType)
    : existing.discountType;

  if (req.body.title !== undefined) {
    const title = String(req.body.title).trim();
    if (!title) throw new AppError("title cannot be empty", 400);
    updates.title = title;
  }

  if (req.body.status !== undefined) {
    const status = String(req.body.status).toLowerCase().trim();
    if (!["active", "inactive"].includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }

  if (req.body.couponCode !== undefined) {
    const couponCode = normalizeCouponCode(req.body.couponCode);
    if (!couponCode) throw new AppError("couponCode cannot be empty", 400);
    if (couponCode !== existing.couponCode) {
      const duplicate = await getCouponByCode(couponCode);
      if (duplicate && duplicate.id !== existing.id) {
        throw new AppError("coupon code already exists", 409);
      }
    }
    updates.couponCode = couponCode;
  }

  if (req.body.discountType !== undefined) {
    const discountType = String(req.body.discountType).toLowerCase().trim();
    if (!ALLOWED_DISCOUNT_TYPES.has(discountType)) {
      throw new AppError("discountType must be percentage or fixed", 400);
    }
    updates.discountType = discountType;
  }

  if (req.body.value !== undefined) {
    try {
      updates.value = normalizeValue(req.body.value, nextDiscountType);
    } catch (err) {
      throw new AppError(err.message, 400);
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let coupon;
  try {
    coupon = await updateCoupon(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Coupon not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Coupon updated successfully",
    coupon,
  });
});

exports.deleteCouponController = asyncHandler(async (req, res) => {
  try {
    await deleteCoupon(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Coupon not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Coupon deleted successfully",
  });
});
