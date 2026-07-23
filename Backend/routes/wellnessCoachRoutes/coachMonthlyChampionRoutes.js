const express = require("express");

const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listCoachMonthlyChampionPostsController,
  getCoachMonthlyChampionPostByIdController,
} = require("../../controllers/wellnessCoachController/monthlyChampionController");

const router = express.Router();

router.get(
  "/",
  protectWellnessCoach,
  authorize("monthly-champions.view"),
  listCoachMonthlyChampionPostsController
);
router.get(
  "/:id",
  protectWellnessCoach,
  authorize("monthly-champions.view"),
  getCoachMonthlyChampionPostByIdController
);

module.exports = router;
