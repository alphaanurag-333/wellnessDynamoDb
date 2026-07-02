const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier } = require("../../middleware/tierGuards");
const {
  optionalHealthProgressWeightPicFile,
  optionalHealthProgressGlucosePicFile,
  optionalHealthProgressBpFile,
  optionalHealthProgressConditionPicFile,
} = require("../../middleware/authMultipart");
const { requireHealthProgressFeature } = require("../../controllers/healthProgressControllerHelpers");
const {
  getHealthProgressSettingsController,
  createWeightLogController,
  listWeightLogsController,
  createGlucoseLogController,
  listGlucoseLogsController,
  createBloodPressureLogController,
  listBloodPressureLogsController,
  createMenstrualCycleLogController,
  listMenstrualCycleLogsController,
  createConditionLogController,
  listConditionLogsController,
} = require("../../controllers/userController/healthProgressController");

const router = express.Router();

router.use(protectUser, requireHealTier);

router.get("/settings", getHealthProgressSettingsController);

router.post(
  "/weight",
  requireHealthProgressFeature("weightPic"),
  optionalHealthProgressWeightPicFile,
  createWeightLogController
);
router.get(
  "/weight",
  requireHealthProgressFeature("weightPic"),
  listWeightLogsController
);

router.post(
  "/glucose",
  requireHealthProgressFeature("glucose"),
  optionalHealthProgressGlucosePicFile,
  createGlucoseLogController
);
router.get(
  "/glucose",
  requireHealthProgressFeature("glucose"),
  listGlucoseLogsController
);

router.post(
  "/blood-pressure",
  requireHealthProgressFeature("bloodPressure"),
  optionalHealthProgressBpFile,
  createBloodPressureLogController
);
router.get(
  "/blood-pressure",
  requireHealthProgressFeature("bloodPressure"),
  listBloodPressureLogsController
);

router.post(
  "/menstrual-cycle",
  requireHealthProgressFeature("menstrualCycle"),
  createMenstrualCycleLogController
);
router.get(
  "/menstrual-cycle",
  requireHealthProgressFeature("menstrualCycle"),
  listMenstrualCycleLogsController
);

router.post(
  "/condition-comparison",
  requireHealthProgressFeature("conditionComparison"),
  optionalHealthProgressConditionPicFile,
  createConditionLogController
);
router.get(
  "/condition-comparison",
  requireHealthProgressFeature("conditionComparison"),
  listConditionLogsController
);

module.exports = router;
