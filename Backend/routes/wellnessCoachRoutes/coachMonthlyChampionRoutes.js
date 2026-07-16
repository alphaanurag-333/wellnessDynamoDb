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
  authorize("nav.monthly-champions"),
  listCoachMonthlyChampionPostsController
);
router.get(
  "/:id",
  protectWellnessCoach,
  authorize("nav.monthly-champions"),
  getCoachMonthlyChampionPostByIdController
);

module.exports = router;
