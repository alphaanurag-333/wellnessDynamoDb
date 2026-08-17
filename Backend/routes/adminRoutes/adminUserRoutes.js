const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalUserFile } = require("../../middleware/authMultipart");
const {
  listUsersController,
  getUserByIdController,
  createUserController,
  updateUserController,
  deleteUserController,
} = require("../../controllers/adminController/userController");
const {
  convertUserToHealController,
  convertUserToSeekController,
  convertUserToMaintenanceController,
  convertMaintenanceUserToHealController,
  assignHealUserController,
  reassignHealUserController,
  listPendingAssignmentUsersController,
} = require("../../controllers/adminController/userAssignmentController");
const { getUserWaterTrackingHistoryController } = require("../../controllers/waterTrackingHistoryController");
const { getUserStepsTrackingHistoryController } = require("../../controllers/stepsTrackingHistoryController");
const { getUserSleepTrackingHistoryController } = require("../../controllers/sleepTrackingHistoryController");
const { getUserHeartRateTrackingHistoryController } = require("../../controllers/heartRateTrackingHistoryController");
const {
  getUserEnergyExchangeAdminController,
} = require("../../controllers/adminController/userEnergyExchangeController");

const router = express.Router();

// GET /pending-assignment backs the "Consultancy > Pending Assignment" nav leaf.
router.get(
  "/pending-assignment",
  protectAccount,
  authorizeStaff("console.cal.view", { admin: "consultancy.pending-assignment.view" }),
  listPendingAssignmentUsersController
);

router.get("/", protectAccount, authorizeStaff("console.cl.view", { admin: "users.view" }), listUsersController);
router.get("/:id/water-tracking", protectAccount, authorizeStaff("console.cl.view", { admin: "users.view" }), getUserWaterTrackingHistoryController);
router.get("/:id/steps-tracking", protectAccount, authorizeStaff("console.cl.view", { admin: "users.view" }), getUserStepsTrackingHistoryController);
router.get(
  "/:id/sleep-tracking",
  protectAccount,
  authorizeStaff("console.body.view", { admin: "users.clientHub.tracking.health-progress" }),
  getUserSleepTrackingHistoryController
);
router.get(
  "/:id/heart-rate-tracking",
  protectAccount,
  authorizeStaff("console.body.view", { admin: "users.clientHub.tracking.health-progress" }),
  getUserHeartRateTrackingHistoryController
);
router.get(
  "/:id/energy-exchange",
  protectAccount,
  authorizeStaff("console.cl.view", { admin: "users.view" }),
  getUserEnergyExchangeAdminController
);
router.get("/:id", protectAccount, authorizeStaff("console.cl.view", { admin: "users.view" }), getUserByIdController);
router.post("/", protectAccount, authorizeStaff("console.cl.edit", { admin: "users.edit" }), optionalUserFile, createUserController);
router.post("/:id/convert-to-heal", protectAccount, authorizeStaff("console.cl.edit", { admin: "users.edit" }), convertUserToHealController);
router.post("/:id/convert-to-seek", protectAccount, authorizeStaff("console.cl.edit", { admin: "users.edit" }), convertUserToSeekController);
router.post("/:id/convert-to-maintenance", protectAccount, authorizeStaff("console.cl.edit", { admin: "users.edit" }), convertUserToMaintenanceController);
router.post("/:id/maintenance-to-heal", protectAccount, authorizeStaff("console.cl.edit", { admin: "users.edit" }), convertMaintenanceUserToHealController);
router.post("/:id/assign-coach", protectAccount, authorizeStaff("console.cl.edit", { admin: "users.edit" }), assignHealUserController);
router.post("/:id/reassign-coach", protectAccount, authorizeStaff("console.cl.edit", { admin: "users.edit" }), reassignHealUserController);
router.patch("/:id", protectAccount, authorizeStaff("console.cl.edit", { admin: "users.edit" }), optionalUserFile, updateUserController);
router.delete("/:id", protectAccount, authorizeStaff("console.cl.delete", { admin: "users.delete" }), deleteUserController);

module.exports = router;
