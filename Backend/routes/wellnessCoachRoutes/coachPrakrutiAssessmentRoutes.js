const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCoachUserPrakrutiThingsToAvoidController,
  listCoachUserPrakrutiQuestionsController,
  getCoachUserPrakrutiAssessmentController,
  saveCoachUserPrakrutiAssessmentController,
  exportCoachUserPrakrutiQuestionsController,
} = require("../../controllers/wellnessCoachController/prakrutiAssessmentController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/prakruti-assessment/things-to-avoid", protectWellnessCoach, listCoachUserPrakrutiThingsToAvoidController);
router.get("/:userId/prakruti-assessment/questions", protectWellnessCoach, listCoachUserPrakrutiQuestionsController);
router.get("/:userId/prakruti-assessment/export", protectWellnessCoach, exportCoachUserPrakrutiQuestionsController);
router.get("/:userId/prakruti-assessment", protectWellnessCoach, getCoachUserPrakrutiAssessmentController);
router.post("/:userId/prakruti-assessment", protectWellnessCoach, saveCoachUserPrakrutiAssessmentController);

module.exports = router;
