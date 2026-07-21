const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  getAdminHealthProgressSettingsController,
  updateAdminHealthProgressSettingsController,
  listAdminWeightLogsController,
  listAdminGlucoseLogsController,
  listAdminBloodPressureLogsController,
  listAdminMenstrualCycleLogsController,
  listAdminConditionLogsController,
} = require("../../controllers/adminController/healUser/healthProgressController.js");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/health-progress-settings",
  protectAdmin, authorize("users.clientHub.tracking.health-progress"),
  getAdminHealthProgressSettingsController
);
router.patch(
  "/:userId/health-progress-settings",
  protectAdmin, authorize("users.clientHub.tracking.health-progress"),
  updateAdminHealthProgressSettingsController
);
router.get(
  "/:userId/health-progress/weight",
  protectAdmin, authorize("users.clientHub.tracking.health-progress"),
  listAdminWeightLogsController
);
router.get(
  "/:userId/health-progress/glucose",
  protectAdmin, authorize("users.clientHub.tracking.health-progress"),
  listAdminGlucoseLogsController
);
router.get(
  "/:userId/health-progress/blood-pressure",
  protectAdmin, authorize("users.clientHub.tracking.health-progress"),
  listAdminBloodPressureLogsController
);
router.get(
  "/:userId/health-progress/menstrual-cycle",
  protectAdmin, authorize("users.clientHub.tracking.health-progress"),
  listAdminMenstrualCycleLogsController
);
router.get(
  "/:userId/health-progress/condition-comparison",
  protectAdmin, authorize("users.clientHub.tracking.health-progress"),
  listAdminConditionLogsController
);

module.exports = router;
