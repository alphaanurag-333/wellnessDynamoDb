const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { requireClientAccess } = require("../../middleware/requireClientAccess");
const { authorize } = require("../../middleware/authorize");
const {
  listAdminUserPrakrutiThingsToAvoidController,
  listAdminUserPrakrutiQuestionsController,
  getAdminUserPrakrutiAssessmentController,
  saveAdminUserPrakrutiAssessmentController,
  exportAdminUserPrakrutiQuestionsController,
} = require("../../controllers/adminController/healUser/prakrutiAssessmentController.js");

const router = express.Router({ mergeParams: true });

router.get("/:userId/prakruti-assessment/things-to-avoid", protectAdmin, requireClientAccess, authorize("users.clientHub.assessments.prakruti-assessment"), listAdminUserPrakrutiThingsToAvoidController);
router.get("/:userId/prakruti-assessment/questions", protectAdmin, requireClientAccess, authorize("users.clientHub.assessments.prakruti-assessment"), listAdminUserPrakrutiQuestionsController);
router.get("/:userId/prakruti-assessment/export", protectAdmin, requireClientAccess, authorize("users.clientHub.assessments.prakruti-assessment"), exportAdminUserPrakrutiQuestionsController);
router.get("/:userId/prakruti-assessment", protectAdmin, requireClientAccess, authorize("users.clientHub.assessments.prakruti-assessment"), getAdminUserPrakrutiAssessmentController);
router.post("/:userId/prakruti-assessment", protectAdmin, requireClientAccess, authorize("users.clientHub.assessments.prakruti-assessment"), saveAdminUserPrakrutiAssessmentController);

module.exports = router;
