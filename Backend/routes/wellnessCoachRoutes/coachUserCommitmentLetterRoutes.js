const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  getCoachUserCommitmentLetterController,
} = require("../../controllers/wellnessCoachController/commitmentLetterController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/commitment-letter", protectWellnessCoach, getCoachUserCommitmentLetterController);

module.exports = router;
