const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listAdminUserTestRecommendationsController,
  createAdminUserTestRecommendationController,
  deleteAdminUserTestRecommendationController,
  listAdminUserLabReportsController,
} = require("../../controllers/adminController/healUser/testRecommendationController.js");

const router = express.Router({ mergeParams: true });

router.get("/:userId/test-recommendations", protectAdmin, authorize("clientHub.care.internal-parameters"), listAdminUserTestRecommendationsController);
router.post("/:userId/test-recommendations", protectAdmin, authorize("clientHub.care.internal-parameters"), createAdminUserTestRecommendationController);
router.get("/:userId/lab-reports", protectAdmin, authorize("clientHub.care.internal-parameters"), listAdminUserLabReportsController);
router.delete(
  "/:userId/test-recommendations/:recommendationId",
  protectAdmin, authorize("clientHub.care.internal-parameters"),
  deleteAdminUserTestRecommendationController
);

module.exports = router;
