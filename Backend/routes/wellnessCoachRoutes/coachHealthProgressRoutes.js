const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  getCoachHealthProgressSettingsController,
  updateCoachHealthProgressSettingsController,
  listCoachWeightLogsController,
  listCoachGlucoseLogsController,
  listCoachBloodPressureLogsController,
  listCoachMenstrualCycleLogsController,
  listCoachConditionLogsController,
} = require("../../controllers/wellnessCoachController/healthProgressController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/health-progress-settings",
  protectWellnessCoach, authorize("clientHub.tracking.health-progress"),
  getCoachHealthProgressSettingsController
);
router.patch(
  "/:userId/health-progress-settings",
  protectWellnessCoach, authorize("clientHub.tracking.health-progress"),
  updateCoachHealthProgressSettingsController
);
router.get(
  "/:userId/health-progress/weight",
  protectWellnessCoach, authorize("clientHub.tracking.health-progress"),
  listCoachWeightLogsController
);
router.get(
  "/:userId/health-progress/glucose",
  protectWellnessCoach, authorize("clientHub.tracking.health-progress"),
  listCoachGlucoseLogsController
);
router.get(
  "/:userId/health-progress/blood-pressure",
  protectWellnessCoach, authorize("clientHub.tracking.health-progress"),
  listCoachBloodPressureLogsController
);
router.get(
  "/:userId/health-progress/menstrual-cycle",
  protectWellnessCoach, authorize("clientHub.tracking.health-progress"),
  listCoachMenstrualCycleLogsController
);
router.get(
  "/:userId/health-progress/condition-comparison",
  protectWellnessCoach, authorize("clientHub.tracking.health-progress"),
  listCoachConditionLogsController
);

module.exports = router;
