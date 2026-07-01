const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCoachUserSupplementDosagesController,
  createCoachUserSupplementDosageController,
  deleteCoachUserSupplementDosageController,
} = require("../../controllers/wellnessCoachController/supplementDosageController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/supplement-dosages",
  protectWellnessCoach,
  listCoachUserSupplementDosagesController
);
router.post(
  "/:userId/supplement-dosages",
  protectWellnessCoach,
  createCoachUserSupplementDosageController
);
router.delete(
  "/:userId/supplement-dosages/:dosageId",
  protectWellnessCoach,
  deleteCoachUserSupplementDosageController
);

module.exports = router;
