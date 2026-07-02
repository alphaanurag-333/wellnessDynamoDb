const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listAssistantUserWellnessPrescriptionsController,
  createAssistantUserWellnessPrescriptionController,
  deleteAssistantUserWellnessPrescriptionController,
} = require("../../controllers/assistantWellnessCoachController/wellnessPrescriptionController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/wellness-prescriptions",
  protectAssistantWellnessCoach,
  listAssistantUserWellnessPrescriptionsController
);
router.post(
  "/:userId/wellness-prescriptions",
  protectAssistantWellnessCoach,
  createAssistantUserWellnessPrescriptionController
);
router.delete(
  "/:userId/wellness-prescriptions/:assignmentId",
  protectAssistantWellnessCoach,
  deleteAssistantUserWellnessPrescriptionController
);

module.exports = router;
