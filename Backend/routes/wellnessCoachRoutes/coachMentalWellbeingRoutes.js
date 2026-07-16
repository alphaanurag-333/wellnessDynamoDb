const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listCoachUserMentalWellbeingController,
  createCoachUserMentalWellbeingController,
  deleteCoachUserMentalWellbeingController,
} = require("../../controllers/wellnessCoachController/mentalWellbeingAssignmentController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/mental-wellbeing", protectWellnessCoach, authorize("clientTab.wellness.mental-wellbeing"), listCoachUserMentalWellbeingController);
router.post("/:userId/mental-wellbeing", protectWellnessCoach, authorize("clientTab.wellness.mental-wellbeing"), createCoachUserMentalWellbeingController);
router.delete(
  "/:userId/mental-wellbeing/:assignmentId",
  protectWellnessCoach, authorize("clientTab.wellness.mental-wellbeing"),
  deleteCoachUserMentalWellbeingController
);

module.exports = router;
