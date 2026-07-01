const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier } = require("../../middleware/tierGuards");
const {
  getUserSupplementRecommendationsController,
  requestSupplementDeliveryController,
  uploadSupplementBillController,
} = require("../../controllers/userController/supplementRecommendationController");
const { optionalSupplementBillFile } = require("../../middleware/authMultipart");

const router = express.Router();

router.get("/recommendations", protectUser, requireHealTier, getUserSupplementRecommendationsController);
router.post(
  "/recommendations/:id/request-delivery",
  protectUser,
  requireHealTier,
  requestSupplementDeliveryController
);
router.post(
  "/recommendations/:id/bill",
  protectUser,
  requireHealTier,
  optionalSupplementBillFile,
  uploadSupplementBillController
);

module.exports = router;
