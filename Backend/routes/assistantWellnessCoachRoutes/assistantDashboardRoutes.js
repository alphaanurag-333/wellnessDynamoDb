const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  getAssistantDashboardStatistics,
} = require("../../controllers/assistantWellnessCoachController/dashboardController");

const router = express.Router();

router.get("/statistics", protectAssistantWellnessCoach, getAssistantDashboardStatistics);

module.exports = router;
