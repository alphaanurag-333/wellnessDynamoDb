const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { optionalDietPlanFile } = require("../../middleware/authMultipart");
const {
  listCoachUserDietPlansController,
  createCoachUserDietPlanController,
  deleteCoachUserDietPlanController,
} = require("../../controllers/wellnessCoachController/dietPlanController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/diet-plans", protectWellnessCoach, listCoachUserDietPlansController);
router.post(
  "/:userId/diet-plans",
  protectWellnessCoach,
  optionalDietPlanFile,
  createCoachUserDietPlanController
);
router.delete(
  "/:userId/diet-plans/:planId",
  protectWellnessCoach,
  deleteCoachUserDietPlanController
);

module.exports = router;
