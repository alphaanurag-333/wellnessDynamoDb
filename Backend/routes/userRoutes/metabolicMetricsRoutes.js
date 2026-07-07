const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier } = require("../../middleware/tierGuards");
const {
  createMetabolicMetricController,
  listMetabolicMetricHistoryController,
  getMetabolicMetricsDashboardController,
  getMetabolicMetricsProfileController,
} = require("../../controllers/userController/metabolicMetricsController");

const router = express.Router();

router.use(protectUser, requireHealTier);

router.get("/profile", getMetabolicMetricsProfileController);
router.get("/dashboard", getMetabolicMetricsDashboardController);
router.get("/history", listMetabolicMetricHistoryController);
router.get("/history/:metricType", listMetabolicMetricHistoryController);

router.post("/", createMetabolicMetricController);
router.post("/:metricType", createMetabolicMetricController);

module.exports = router;
