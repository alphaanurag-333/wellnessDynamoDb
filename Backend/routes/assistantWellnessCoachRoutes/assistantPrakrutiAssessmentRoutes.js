const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listAssistantUserPrakrutiThingsToAvoidController,
  listAssistantUserPrakrutiQuestionsController,
  getAssistantUserPrakrutiAssessmentController,
  saveAssistantUserPrakrutiAssessmentController,
  exportAssistantUserPrakrutiQuestionsController,
} = require("../../controllers/assistantWellnessCoachController/prakrutiAssessmentController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/prakruti-assessment/things-to-avoid",
  protectAssistantWellnessCoach,
  listAssistantUserPrakrutiThingsToAvoidController
);
router.get(
  "/:userId/prakruti-assessment/questions",
  protectAssistantWellnessCoach,
  listAssistantUserPrakrutiQuestionsController
);
router.get(
  "/:userId/prakruti-assessment/export",
  protectAssistantWellnessCoach,
  exportAssistantUserPrakrutiQuestionsController
);
router.get(
  "/:userId/prakruti-assessment",
  protectAssistantWellnessCoach,
  getAssistantUserPrakrutiAssessmentController
);
router.post(
  "/:userId/prakruti-assessment",
  protectAssistantWellnessCoach,
  saveAssistantUserPrakrutiAssessmentController
);

module.exports = router;
