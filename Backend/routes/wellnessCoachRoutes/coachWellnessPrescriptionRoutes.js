const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listCoachUserWellnessPrescriptionsController,
  createCoachUserWellnessPrescriptionController,
  deleteCoachUserWellnessPrescriptionController,
} = require("../../controllers/wellnessCoachController/wellnessPrescriptionController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/wellness-prescriptions",
  protectWellnessCoach, authorize("clientTab.care.wellness-prescriptions"),
  listCoachUserWellnessPrescriptionsController
);
router.post(
  "/:userId/wellness-prescriptions",
  protectWellnessCoach, authorize("clientTab.care.wellness-prescriptions"),
  createCoachUserWellnessPrescriptionController
);
router.delete(
  "/:userId/wellness-prescriptions/:assignmentId",
  protectWellnessCoach, authorize("clientTab.care.wellness-prescriptions"),
  deleteCoachUserWellnessPrescriptionController
);

module.exports = router;
