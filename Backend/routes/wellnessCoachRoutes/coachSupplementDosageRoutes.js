const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listCoachUserSupplementDosagesController,
  createCoachUserSupplementDosageController,
  deleteCoachUserSupplementDosageController,
} = require("../../controllers/wellnessCoachController/supplementDosageController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/supplement-dosages",
  protectWellnessCoach, authorize("clientTab.wellness.supplement-dosage"),
  listCoachUserSupplementDosagesController
);
router.post(
  "/:userId/supplement-dosages",
  protectWellnessCoach, authorize("clientTab.wellness.supplement-dosage"),
  createCoachUserSupplementDosageController
);
router.delete(
  "/:userId/supplement-dosages/:dosageId",
  protectWellnessCoach, authorize("clientTab.wellness.supplement-dosage"),
  deleteCoachUserSupplementDosageController
);

module.exports = router;
