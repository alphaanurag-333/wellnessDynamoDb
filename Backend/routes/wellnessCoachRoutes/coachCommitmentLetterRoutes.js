const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listCoachCommitmentLettersController,
  listCoachPendingCommitmentLettersController,
  getCoachCommitmentLetterByIdController,
  reviewCoachCommitmentLetterController,
  deleteCoachCommitmentLetterController,
} = require("../../controllers/wellnessCoachController/commitmentLetterController");

const router = express.Router();

router.get(
  "/pending",
  protectWellnessCoach,
  authorize("commitment-letters.view"),
  listCoachPendingCommitmentLettersController
);
router.get(
  "/",
  protectWellnessCoach,
  authorize("commitment-letters.view"),
  listCoachCommitmentLettersController
);
router.get(
  "/:id",
  protectWellnessCoach,
  authorize("commitment-letters.view"),
  getCoachCommitmentLetterByIdController
);
router.patch(
  "/:id/review",
  protectWellnessCoach,
  authorize("commitment-letters.view"),
  reviewCoachCommitmentLetterController
);
router.delete(
  "/:id",
  protectWellnessCoach,
  authorize("commitment-letters.view"),
  deleteCoachCommitmentLetterController
);

module.exports = router;
