const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
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
  protectWellnessCoach,
  getCoachHealthProgressSettingsController
);
router.patch(
  "/:userId/health-progress-settings",
  protectWellnessCoach,
  updateCoachHealthProgressSettingsController
);
router.get(
  "/:userId/health-progress/weight",
  protectWellnessCoach,
  listCoachWeightLogsController
);
router.get(
  "/:userId/health-progress/glucose",
  protectWellnessCoach,
  listCoachGlucoseLogsController
);
router.get(
  "/:userId/health-progress/blood-pressure",
  protectWellnessCoach,
  listCoachBloodPressureLogsController
);
router.get(
  "/:userId/health-progress/menstrual-cycle",
  protectWellnessCoach,
  listCoachMenstrualCycleLogsController
);
router.get(
  "/:userId/health-progress/condition-comparison",
  protectWellnessCoach,
  listCoachConditionLogsController
);

module.exports = router;
