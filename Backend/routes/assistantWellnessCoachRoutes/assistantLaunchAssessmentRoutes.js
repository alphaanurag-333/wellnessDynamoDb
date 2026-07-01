const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listAssistantUserLaunchFocusAreasController,
  listAssistantUserLaunchQuestionsController,
  listAssistantUserLaunchAssessmentsController,
  getAssistantUserLaunchAssessmentByDateController,
  createAssistantUserLaunchAssessmentController,
  updateAssistantUserLaunchAssessmentController,
  deleteAssistantUserLaunchAssessmentController,
  exportAssistantUserLaunchQuestionsController,
} = require("../../controllers/assistantWellnessCoachController/launchAssessmentController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/launch-assessment/focus-areas",
  protectAssistantWellnessCoach,
  listAssistantUserLaunchFocusAreasController
);
router.get(
  "/:userId/launch-assessment/questions",
  protectAssistantWellnessCoach,
  listAssistantUserLaunchQuestionsController
);
router.get(
  "/:userId/launch-assessment/export",
  protectAssistantWellnessCoach,
  exportAssistantUserLaunchQuestionsController
);
router.get(
  "/:userId/launch-assessment",
  protectAssistantWellnessCoach,
  listAssistantUserLaunchAssessmentsController
);
router.get(
  "/:userId/launch-assessment/by-date",
  protectAssistantWellnessCoach,
  getAssistantUserLaunchAssessmentByDateController
);
router.post(
  "/:userId/launch-assessment",
  protectAssistantWellnessCoach,
  createAssistantUserLaunchAssessmentController
);
router.patch(
  "/:userId/launch-assessment/:assessmentId",
  protectAssistantWellnessCoach,
  updateAssistantUserLaunchAssessmentController
);
router.delete(
  "/:userId/launch-assessment/:assessmentId",
  protectAssistantWellnessCoach,
  deleteAssistantUserLaunchAssessmentController
);

module.exports = router;
