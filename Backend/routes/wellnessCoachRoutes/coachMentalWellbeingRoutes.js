const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCoachUserMentalWellbeingController,
  createCoachUserMentalWellbeingController,
  deleteCoachUserMentalWellbeingController,
} = require("../../controllers/wellnessCoachController/mentalWellbeingAssignmentController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/mental-wellbeing", protectWellnessCoach, listCoachUserMentalWellbeingController);
router.post("/:userId/mental-wellbeing", protectWellnessCoach, createCoachUserMentalWellbeingController);
router.delete(
  "/:userId/mental-wellbeing/:assignmentId",
  protectWellnessCoach,
  deleteCoachUserMentalWellbeingController
);

module.exports = router;
