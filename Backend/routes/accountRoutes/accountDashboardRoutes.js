const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { getStaffDashboardStatistics } = require("../../controllers/adminController/dashboardController");

const router = express.Router();

router.get(
  "/statistics",
  protectAccount,
  authorizeStaff("console.dash.view", {
    admin: "dashboard.view",
    wellness_coach: "nav.dashboard",
    assistant_wellness_coach: "nav.dashboard",
    trainee: "nav.dashboard",
    support: "nav.dashboard",
  }),
  getStaffDashboardStatistics
);

module.exports = router;
