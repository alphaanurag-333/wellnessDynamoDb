const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { requireClientAccess } = require("../../middleware/requireClientAccess");
const { authorize } = require("../../middleware/authorize");
const {
  getAdminMetabolicMetricsDashboardController,
  listAdminMetabolicMetricHistoryController,
  createAdminFattyLiverMetricController,
} = require("../../controllers/adminController/healUser/metabolicMetricsController.js");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/metabolic-metrics/dashboard",
  protectAdmin, requireClientAccess, authorize("users.clientHub.metabolic-health.metabolic-metrics"),
  getAdminMetabolicMetricsDashboardController
);
router.get(
  "/:userId/metabolic-metrics/history",
  protectAdmin, requireClientAccess, authorize("users.clientHub.metabolic-health.metabolic-metrics"),
  listAdminMetabolicMetricHistoryController
);
router.get(
  "/:userId/metabolic-metrics/history/:metricType",
  protectAdmin, requireClientAccess, authorize("users.clientHub.metabolic-health.metabolic-metrics"),
  listAdminMetabolicMetricHistoryController
);
router.post(
  "/:userId/metabolic-metrics/fatty-liver",
  protectAdmin, requireClientAccess, authorize("users.clientHub.metabolic-health.metabolic-metrics"),
  createAdminFattyLiverMetricController
);

module.exports = router;
