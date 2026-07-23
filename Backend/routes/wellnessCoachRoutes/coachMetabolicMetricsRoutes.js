const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  getCoachMetabolicMetricsDashboardController,
  listCoachMetabolicMetricHistoryController,
  createCoachFattyLiverMetricController,
} = require("../../controllers/wellnessCoachController/metabolicMetricsController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/metabolic-metrics/dashboard",
  protectWellnessCoach, authorize("clientHub.metabolic-health.metabolic-metrics"),
  getCoachMetabolicMetricsDashboardController
);
router.get(
  "/:userId/metabolic-metrics/history",
  protectWellnessCoach, authorize("clientHub.metabolic-health.metabolic-metrics"),
  listCoachMetabolicMetricHistoryController
);
router.get(
  "/:userId/metabolic-metrics/history/:metricType",
  protectWellnessCoach, authorize("clientHub.metabolic-health.metabolic-metrics"),
  listCoachMetabolicMetricHistoryController
);
router.post(
  "/:userId/metabolic-metrics/fatty-liver",
  protectWellnessCoach, authorize("clientHub.metabolic-health.metabolic-metrics"),
  createCoachFattyLiverMetricController
);

module.exports = router;
