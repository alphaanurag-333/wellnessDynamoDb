const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCoachUserWellnessPrescriptionsController,
  createCoachUserWellnessPrescriptionController,
  deleteCoachUserWellnessPrescriptionController,
} = require("../../controllers/wellnessCoachController/wellnessPrescriptionController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/wellness-prescriptions",
  protectWellnessCoach,
  listCoachUserWellnessPrescriptionsController
);
router.post(
  "/:userId/wellness-prescriptions",
  protectWellnessCoach,
  createCoachUserWellnessPrescriptionController
);
router.delete(
  "/:userId/wellness-prescriptions/:assignmentId",
  protectWellnessCoach,
  deleteCoachUserWellnessPrescriptionController
);

module.exports = router;
