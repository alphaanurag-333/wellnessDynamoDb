const express = require("express");

const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCoachMonthlyChampionPostsController,
  getCoachMonthlyChampionPostByIdController,
} = require("../../controllers/wellnessCoachController/monthlyChampionController");

const router = express.Router();

router.get("/", protectWellnessCoach, listCoachMonthlyChampionPostsController);
router.get("/:id", protectWellnessCoach, getCoachMonthlyChampionPostByIdController);

module.exports = router;
