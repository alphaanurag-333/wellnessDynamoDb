const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { getStaffDashboardStatistics } = require("../../controllers/adminController/dashboardController");
const { listPendingTasksController } = require("../../controllers/adminController/pendingTasksController");

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

router.get(
  "/pending-tasks",
  protectAccount,
  authorizeStaff("console.pt.view", {
    admin: "dashboard.view",
    wellness_coach: "nav.dashboard",
    assistant_wellness_coach: "nav.dashboard",
    trainee: "nav.dashboard",
    support: "nav.dashboard",
  }),
  listPendingTasksController
);

module.exports = router;
