const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  getAssistantMetabolicMetricsDashboardController,
  listAssistantMetabolicMetricHistoryController,
} = require("../../controllers/assistantWellnessCoachController/metabolicMetricsController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/metabolic-metrics/dashboard",
  protectAssistantWellnessCoach,
  getAssistantMetabolicMetricsDashboardController
);
router.get(
  "/:userId/metabolic-metrics/history",
  protectAssistantWellnessCoach,
  listAssistantMetabolicMetricHistoryController
);
router.get(
  "/:userId/metabolic-metrics/history/:metricType",
  protectAssistantWellnessCoach,
  listAssistantMetabolicMetricHistoryController
);

module.exports = router;
