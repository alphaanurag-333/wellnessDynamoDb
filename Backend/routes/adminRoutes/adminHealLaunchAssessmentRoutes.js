const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listAdminUserLaunchFocusAreasController,
  listAdminUserLaunchQuestionsController,
  listAdminUserLaunchAssessmentsController,
  getAdminUserLaunchAssessmentByDateController,
  createAdminUserLaunchAssessmentController,
  updateAdminUserLaunchAssessmentController,
  deleteAdminUserLaunchAssessmentController,
  exportAdminUserLaunchQuestionsController,
} = require("../../controllers/adminController/healUser/launchAssessmentController.js");

const router = express.Router({ mergeParams: true });

router.get("/:userId/launch-assessment/focus-areas", protectAdmin, authorize("clientHub.assessments.launch-assessment"), listAdminUserLaunchFocusAreasController);
router.get("/:userId/launch-assessment/questions", protectAdmin, authorize("clientHub.assessments.launch-assessment"), listAdminUserLaunchQuestionsController);
router.get("/:userId/launch-assessment/export", protectAdmin, authorize("clientHub.assessments.launch-assessment"), exportAdminUserLaunchQuestionsController);
router.get("/:userId/launch-assessment", protectAdmin, authorize("clientHub.assessments.launch-assessment"), listAdminUserLaunchAssessmentsController);
router.get("/:userId/launch-assessment/by-date", protectAdmin, authorize("clientHub.assessments.launch-assessment"), getAdminUserLaunchAssessmentByDateController);
router.post("/:userId/launch-assessment", protectAdmin, authorize("clientHub.assessments.launch-assessment"), createAdminUserLaunchAssessmentController);
router.patch(
  "/:userId/launch-assessment/:assessmentId",
  protectAdmin, authorize("clientHub.assessments.launch-assessment"),
  updateAdminUserLaunchAssessmentController
);
router.delete(
  "/:userId/launch-assessment/:assessmentId",
  protectAdmin, authorize("clientHub.assessments.launch-assessment"),
  deleteAdminUserLaunchAssessmentController
);

module.exports = router;
