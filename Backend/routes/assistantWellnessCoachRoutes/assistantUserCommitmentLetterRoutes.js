const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  getAssistantUserCommitmentLetterController,
} = require("../../controllers/assistantWellnessCoachController/commitmentLetterController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/commitment-letter",
  protectAssistantWellnessCoach,
  getAssistantUserCommitmentLetterController
);

module.exports = router;
