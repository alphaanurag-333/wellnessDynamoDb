const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listAssistantUserMentalWellbeingController,
  createAssistantUserMentalWellbeingController,
  deleteAssistantUserMentalWellbeingController,
} = require("../../controllers/assistantWellnessCoachController/mentalWellbeingAssignmentController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/mental-wellbeing", protectAssistantWellnessCoach, listAssistantUserMentalWellbeingController);
router.post("/:userId/mental-wellbeing", protectAssistantWellnessCoach, createAssistantUserMentalWellbeingController);
router.delete(
  "/:userId/mental-wellbeing/:assignmentId",
  protectAssistantWellnessCoach,
  deleteAssistantUserMentalWellbeingController
);

module.exports = router;
