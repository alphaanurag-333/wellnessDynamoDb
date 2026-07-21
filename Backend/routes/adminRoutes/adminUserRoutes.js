const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
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
  protectAdmin,
  authorize("consultancy.pending-assignment.view"),
  listPendingAssignmentUsersController
);

router.get("/", protectAdmin, authorize("users.view"), listUsersController);
router.get("/:id/water-tracking", protectAdmin, authorize("users.view"), getUserWaterTrackingHistoryController);
router.get("/:id/steps-tracking", protectAdmin, authorize("users.view"), getUserStepsTrackingHistoryController);
router.get(
  "/:id/sleep-tracking",
  protectAdmin,
  authorize("users.clientHub.tracking.health-progress"),
  getUserSleepTrackingHistoryController
);
router.get(
  "/:id/heart-rate-tracking",
  protectAdmin,
  authorize("users.clientHub.tracking.health-progress"),
  getUserHeartRateTrackingHistoryController
);
router.get(
  "/:id/energy-exchange",
  protectAdmin,
  authorize("users.view"),
  getUserEnergyExchangeAdminController
);
router.get("/:id", protectAdmin, authorize("users.view"), getUserByIdController);
router.post("/", protectAdmin, authorize("users.edit"), optionalUserFile, createUserController);
router.post("/:id/convert-to-heal", protectAdmin, authorize("users.edit"), convertUserToHealController);
router.post("/:id/convert-to-seek", protectAdmin, authorize("users.edit"), convertUserToSeekController);
router.post("/:id/assign-coach", protectAdmin, authorize("users.edit"), assignHealUserController);
router.post("/:id/reassign-coach", protectAdmin, authorize("users.edit"), reassignHealUserController);
router.patch("/:id", protectAdmin, authorize("users.edit"), optionalUserFile, updateUserController);
router.delete("/:id", protectAdmin, authorize("users.delete"), deleteUserController);

module.exports = router;
