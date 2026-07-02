const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  getAssistantHealthProgressSettingsController,
  listAssistantWeightLogsController,
  listAssistantGlucoseLogsController,
  listAssistantBloodPressureLogsController,
  listAssistantMenstrualCycleLogsController,
  listAssistantConditionLogsController,
} = require("../../controllers/assistantWellnessCoachController/healthProgressController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/health-progress-settings",
  protectAssistantWellnessCoach,
  getAssistantHealthProgressSettingsController
);
router.get(
  "/:userId/health-progress/weight",
  protectAssistantWellnessCoach,
  listAssistantWeightLogsController
);
router.get(
  "/:userId/health-progress/glucose",
  protectAssistantWellnessCoach,
  listAssistantGlucoseLogsController
);
router.get(
  "/:userId/health-progress/blood-pressure",
  protectAssistantWellnessCoach,
  listAssistantBloodPressureLogsController
);
router.get(
  "/:userId/health-progress/menstrual-cycle",
  protectAssistantWellnessCoach,
  listAssistantMenstrualCycleLogsController
);
router.get(
  "/:userId/health-progress/condition-comparison",
  protectAssistantWellnessCoach,
  listAssistantConditionLogsController
);

module.exports = router;
