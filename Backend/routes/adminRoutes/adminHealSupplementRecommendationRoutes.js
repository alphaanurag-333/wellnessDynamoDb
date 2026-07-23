const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listAdminUserSupplementRecommendationsController,
  createAdminUserSupplementRecommendationController,
  deleteAdminUserSupplementRecommendationController,
} = require("../../controllers/adminController/healUser/supplementRecommendationController.js");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/supplement-recommendations",
  protectAdmin, authorize("clientHub.wellness.supplement-recommendations"),
  listAdminUserSupplementRecommendationsController
);
router.post(
  "/:userId/supplement-recommendations",
  protectAdmin, authorize("clientHub.wellness.supplement-recommendations"),
  createAdminUserSupplementRecommendationController
);
router.delete(
  "/:userId/supplement-recommendations/:recommendationId",
  protectAdmin, authorize("clientHub.wellness.supplement-recommendations"),
  deleteAdminUserSupplementRecommendationController
);

module.exports = router;
