const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listAssistantCommitmentLettersController,
  listAssistantPendingCommitmentLettersController,
  getAssistantCommitmentLetterByIdController,
  reviewAssistantCommitmentLetterController,
  deleteAssistantCommitmentLetterController,
} = require("../../controllers/assistantWellnessCoachController/commitmentLetterController");

const router = express.Router();

router.get("/pending", protectAssistantWellnessCoach, listAssistantPendingCommitmentLettersController);
router.get("/", protectAssistantWellnessCoach, listAssistantCommitmentLettersController);
router.get("/:id", protectAssistantWellnessCoach, getAssistantCommitmentLetterByIdController);
router.patch("/:id/review", protectAssistantWellnessCoach, reviewAssistantCommitmentLetterController);
router.delete("/:id", protectAssistantWellnessCoach, deleteAssistantCommitmentLetterController);

module.exports = router;
