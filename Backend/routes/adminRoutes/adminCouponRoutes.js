const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const {
  listCouponsController,
  getCouponByIdController,
  createCouponController,
  updateCouponController,
  deleteCouponController,
} = require("../../controllers/adminController/couponController");

const router = express.Router();

router.get("/", protectAdmin, listCouponsController);
router.get("/:id", protectAdmin, getCouponByIdController);
router.post("/", protectAdmin, createCouponController);
router.patch("/:id", protectAdmin, updateCouponController);
router.delete("/:id", protectAdmin, deleteCouponController);

module.exports = router;
