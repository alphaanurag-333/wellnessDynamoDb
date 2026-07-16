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

router.get("/:userId/launch-assessment/focus-areas", protectWellnessCoach, authorize("clientTab.assessments.launch-assessment"), listCoachUserLaunchFocusAreasController);
router.get("/:userId/launch-assessment/questions", protectWellnessCoach, authorize("clientTab.assessments.launch-assessment"), listCoachUserLaunchQuestionsController);
router.get("/:userId/launch-assessment/export", protectWellnessCoach, authorize("clientTab.assessments.launch-assessment"), exportCoachUserLaunchQuestionsController);
router.get("/:userId/launch-assessment", protectWellnessCoach, authorize("clientTab.assessments.launch-assessment"), listCoachUserLaunchAssessmentsController);
router.get("/:userId/launch-assessment/by-date", protectWellnessCoach, authorize("clientTab.assessments.launch-assessment"), getCoachUserLaunchAssessmentByDateController);
router.post("/:userId/launch-assessment", protectWellnessCoach, authorize("clientTab.assessments.launch-assessment"), createCoachUserLaunchAssessmentController);
router.patch(
  "/:userId/launch-assessment/:assessmentId",
  protectWellnessCoach, authorize("clientTab.assessments.launch-assessment"),
  updateCoachUserLaunchAssessmentController
);
router.delete(
  "/:userId/launch-assessment/:assessmentId",
  protectWellnessCoach, authorize("clientTab.assessments.launch-assessment"),
  deleteCoachUserLaunchAssessmentController
);

module.exports = router;
