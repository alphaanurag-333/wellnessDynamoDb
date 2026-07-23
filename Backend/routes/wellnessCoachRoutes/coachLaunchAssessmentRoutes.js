const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
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

router.get("/:userId/launch-assessment/focus-areas", protectWellnessCoach, authorize("clientHub.assessments.launch-assessment"), listCoachUserLaunchFocusAreasController);
router.get("/:userId/launch-assessment/questions", protectWellnessCoach, authorize("clientHub.assessments.launch-assessment"), listCoachUserLaunchQuestionsController);
router.get("/:userId/launch-assessment/export", protectWellnessCoach, authorize("clientHub.assessments.launch-assessment"), exportCoachUserLaunchQuestionsController);
router.get("/:userId/launch-assessment", protectWellnessCoach, authorize("clientHub.assessments.launch-assessment"), listCoachUserLaunchAssessmentsController);
router.get("/:userId/launch-assessment/by-date", protectWellnessCoach, authorize("clientHub.assessments.launch-assessment"), getCoachUserLaunchAssessmentByDateController);
router.post("/:userId/launch-assessment", protectWellnessCoach, authorize("clientHub.assessments.launch-assessment"), createCoachUserLaunchAssessmentController);
router.patch(
  "/:userId/launch-assessment/:assessmentId",
  protectWellnessCoach, authorize("clientHub.assessments.launch-assessment"),
  updateCoachUserLaunchAssessmentController
);
router.delete(
  "/:userId/launch-assessment/:assessmentId",
  protectWellnessCoach, authorize("clientHub.assessments.launch-assessment"),
  deleteCoachUserLaunchAssessmentController
);

module.exports = router;
