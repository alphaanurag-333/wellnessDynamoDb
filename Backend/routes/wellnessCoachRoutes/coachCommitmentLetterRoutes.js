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
  authorize("nav.commitment-letters"),
  listCoachPendingCommitmentLettersController
);
router.get(
  "/",
  protectWellnessCoach,
  authorize("nav.commitment-letters"),
  listCoachCommitmentLettersController
);
router.get(
  "/:id",
  protectWellnessCoach,
  authorize("nav.commitment-letters"),
  getCoachCommitmentLetterByIdController
);
router.patch(
  "/:id/review",
  protectWellnessCoach,
  authorize("nav.commitment-letters"),
  reviewCoachCommitmentLetterController
);
router.delete(
  "/:id",
  protectWellnessCoach,
  authorize("nav.commitment-letters"),
  deleteCoachCommitmentLetterController
);

module.exports = router;
