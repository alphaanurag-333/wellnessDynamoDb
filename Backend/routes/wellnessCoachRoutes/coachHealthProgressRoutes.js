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
  protectWellnessCoach, authorize("clientTab.tracking.health-progress"),
  getCoachHealthProgressSettingsController
);
router.patch(
  "/:userId/health-progress-settings",
  protectWellnessCoach, authorize("clientTab.tracking.health-progress"),
  updateCoachHealthProgressSettingsController
);
router.get(
  "/:userId/health-progress/weight",
  protectWellnessCoach, authorize("clientTab.tracking.health-progress"),
  listCoachWeightLogsController
);
router.get(
  "/:userId/health-progress/glucose",
  protectWellnessCoach, authorize("clientTab.tracking.health-progress"),
  listCoachGlucoseLogsController
);
router.get(
  "/:userId/health-progress/blood-pressure",
  protectWellnessCoach, authorize("clientTab.tracking.health-progress"),
  listCoachBloodPressureLogsController
);
router.get(
  "/:userId/health-progress/menstrual-cycle",
  protectWellnessCoach, authorize("clientTab.tracking.health-progress"),
  listCoachMenstrualCycleLogsController
);
router.get(
  "/:userId/health-progress/condition-comparison",
  protectWellnessCoach, authorize("clientTab.tracking.health-progress"),
  listCoachConditionLogsController
);

module.exports = router;
