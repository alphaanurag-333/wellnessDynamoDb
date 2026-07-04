const express = require("express");

const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listAssistantMonthlyChampionPostsController,
  getAssistantMonthlyChampionPostByIdController,
} = require("../../controllers/assistantWellnessCoachController/monthlyChampionController");

const router = express.Router();

router.get("/", protectAssistantWellnessCoach, listAssistantMonthlyChampionPostsController);
router.get("/:id", protectAssistantWellnessCoach, getAssistantMonthlyChampionPostByIdController);

module.exports = router;
