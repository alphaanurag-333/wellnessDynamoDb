const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCoachUserLaunchFocusAreasController,
  listCoachUserLaunchQuestionsController,
  listCoachUserLaunchAssessmentsController,
  getCoachUserLaunchAssessmentByDateController,
  createCoachUserLaunchAssessmentController,
  updateCoachUserLaunchAssessmentController,
  deleteCoachUserLaunchAssessmentController,
  exportCoachUserLaunchQuestionsController,
} = require("../../controllers/wellnessCoachController/launchAssessmentController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/launch-assessment/focus-areas", protectWellnessCoach, listCoachUserLaunchFocusAreasController);
router.get("/:userId/launch-assessment/questions", protectWellnessCoach, listCoachUserLaunchQuestionsController);
router.get("/:userId/launch-assessment/export", protectWellnessCoach, exportCoachUserLaunchQuestionsController);
router.get("/:userId/launch-assessment", protectWellnessCoach, listCoachUserLaunchAssessmentsController);
router.get("/:userId/launch-assessment/by-date", protectWellnessCoach, getCoachUserLaunchAssessmentByDateController);
router.post("/:userId/launch-assessment", protectWellnessCoach, createCoachUserLaunchAssessmentController);
router.patch(
  "/:userId/launch-assessment/:assessmentId",
  protectWellnessCoach,
  updateCoachUserLaunchAssessmentController
);
router.delete(
  "/:userId/launch-assessment/:assessmentId",
  protectWellnessCoach,
  deleteCoachUserLaunchAssessmentController
);

module.exports = router;
