const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  getCoachMetabolicMetricsDashboardController,
  listCoachMetabolicMetricHistoryController,
  createCoachFattyLiverMetricController,
} = require("../../controllers/wellnessCoachController/metabolicMetricsController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/metabolic-metrics/dashboard",
  protectWellnessCoach,
  getCoachMetabolicMetricsDashboardController
);
router.get(
  "/:userId/metabolic-metrics/history",
  protectWellnessCoach,
  listCoachMetabolicMetricHistoryController
);
router.get(
  "/:userId/metabolic-metrics/history/:metricType",
  protectWellnessCoach,
  listCoachMetabolicMetricHistoryController
);
router.post(
  "/:userId/metabolic-metrics/fatty-liver",
  protectWellnessCoach,
  createCoachFattyLiverMetricController
);

module.exports = router;
