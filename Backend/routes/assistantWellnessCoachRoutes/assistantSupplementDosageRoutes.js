const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listAssistantUserSupplementDosagesController,
  createAssistantUserSupplementDosageController,
  deleteAssistantUserSupplementDosageController,
} = require("../../controllers/assistantWellnessCoachController/supplementDosageController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/supplement-dosages",
  protectAssistantWellnessCoach,
  listAssistantUserSupplementDosagesController
);
router.post(
  "/:userId/supplement-dosages",
  protectAssistantWellnessCoach,
  createAssistantUserSupplementDosageController
);
router.delete(
  "/:userId/supplement-dosages/:dosageId",
  protectAssistantWellnessCoach,
  deleteAssistantUserSupplementDosageController
);

module.exports = router;
