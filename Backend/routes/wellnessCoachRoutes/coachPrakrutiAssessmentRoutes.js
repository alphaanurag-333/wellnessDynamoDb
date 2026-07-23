const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listCoachUserPrakrutiThingsToAvoidController,
  listCoachUserPrakrutiQuestionsController,
  getCoachUserPrakrutiAssessmentController,
  saveCoachUserPrakrutiAssessmentController,
  exportCoachUserPrakrutiQuestionsController,
} = require("../../controllers/wellnessCoachController/prakrutiAssessmentController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/prakruti-assessment/things-to-avoid", protectWellnessCoach, authorize("clientHub.assessments.prakruti-assessment"), listCoachUserPrakrutiThingsToAvoidController);
router.get("/:userId/prakruti-assessment/questions", protectWellnessCoach, authorize("clientHub.assessments.prakruti-assessment"), listCoachUserPrakrutiQuestionsController);
router.get("/:userId/prakruti-assessment/export", protectWellnessCoach, authorize("clientHub.assessments.prakruti-assessment"), exportCoachUserPrakrutiQuestionsController);
router.get("/:userId/prakruti-assessment", protectWellnessCoach, authorize("clientHub.assessments.prakruti-assessment"), getCoachUserPrakrutiAssessmentController);
router.post("/:userId/prakruti-assessment", protectWellnessCoach, authorize("clientHub.assessments.prakruti-assessment"), saveCoachUserPrakrutiAssessmentController);

module.exports = router;
