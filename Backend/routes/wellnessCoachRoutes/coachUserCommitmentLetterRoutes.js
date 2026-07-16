const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  getCoachUserCommitmentLetterController,
} = require("../../controllers/wellnessCoachController/commitmentLetterController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/commitment-letter", protectWellnessCoach, authorize("clientTab.care.commitment-letter"), getCoachUserCommitmentLetterController);

module.exports = router;
