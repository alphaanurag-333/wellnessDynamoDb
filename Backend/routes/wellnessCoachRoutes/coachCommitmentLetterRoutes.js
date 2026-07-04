const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCoachCommitmentLettersController,
  listCoachPendingCommitmentLettersController,
  getCoachCommitmentLetterByIdController,
  reviewCoachCommitmentLetterController,
  deleteCoachCommitmentLetterController,
} = require("../../controllers/wellnessCoachController/commitmentLetterController");

const router = express.Router();

router.get("/pending", protectWellnessCoach, listCoachPendingCommitmentLettersController);
router.get("/", protectWellnessCoach, listCoachCommitmentLettersController);
router.get("/:id", protectWellnessCoach, getCoachCommitmentLetterByIdController);
router.patch("/:id/review", protectWellnessCoach, reviewCoachCommitmentLetterController);
router.delete("/:id", protectWellnessCoach, deleteCoachCommitmentLetterController);

module.exports = router;
