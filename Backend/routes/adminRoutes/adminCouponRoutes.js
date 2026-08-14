const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listCouponsController,
  getCouponByIdController,
  createCouponController,
  updateCouponController,
  deleteCouponController,
} = require("../../controllers/adminController/couponController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "coupons.view" }), listCouponsController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "coupons.view" }), getCouponByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "coupons.edit" }), createCouponController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "coupons.edit" }), updateCouponController);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "coupons.delete" }), deleteCouponController);

module.exports = router;
