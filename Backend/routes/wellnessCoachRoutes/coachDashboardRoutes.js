const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  getCoachDashboardStatistics,
} = require("../../controllers/wellnessCoachController/dashboardController");

const router = express.Router();

router.get("/statistics", protectWellnessCoach, getCoachDashboardStatistics);

module.exports = router;
