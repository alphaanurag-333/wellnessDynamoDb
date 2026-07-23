const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  getCoachDashboardStatistics,
} = require("../../controllers/wellnessCoachController/dashboardController");

const router = express.Router();

router.get(
  "/statistics",
  protectWellnessCoach,
  authorize("dashboard.view"),
  getCoachDashboardStatistics
);

module.exports = router;
