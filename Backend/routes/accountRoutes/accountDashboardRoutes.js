const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  getStaffDashboardStatistics,
  listStaffDashboardPayments,
  sendTeamRemindersController,
} = require("../../controllers/adminController/dashboardController");
const { listPendingTasksController } = require("../../controllers/adminController/pendingTasksController");

const router = express.Router();

const dashboardViewAuth = authorizeStaff("console.dash.view", {
  admin: "dashboard.view",
  wellness_coach: "nav.dashboard",
  assistant_wellness_coach: "nav.dashboard",
  trainee: "nav.dashboard",
  support: "nav.dashboard",
});

router.get(
  "/statistics",
  protectAccount,
  dashboardViewAuth,
  getStaffDashboardStatistics
);

router.get(
  "/payments",
  protectAccount,
  dashboardViewAuth,
  listStaffDashboardPayments
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

router.post(
  "/team-reminders",
  protectAccount,
  dashboardViewAuth,
  sendTeamRemindersController
);

module.exports = router;
