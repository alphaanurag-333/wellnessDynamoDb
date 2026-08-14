const express = require("express");
const { protectAccount, requireActiveRole } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { CLINICAL_ROLES } = require("../../controllers/staffAccess");
const {
  listCoachCommitmentLettersController,
  listCoachPendingCommitmentLettersController,
  getCoachCommitmentLetterByIdController,
  reviewCoachCommitmentLetterController,
  deleteCoachCommitmentLetterController,
} = require("../../controllers/staff/commitmentLetterController");

const router = express.Router();
router.use(protectAccount, requireActiveRole(...CLINICAL_ROLES));

const view = authorizeStaff("console.pt.view", {
  admin: "commitment-letters.view",
  wellness_coach: "nav.commitment-letters",
  assistant_wellness_coach: "nav.commitment-letters",
  trainee: "nav.commitment-letters",
});
const write = authorizeStaff("console.pt.edit", {
  admin: "commitment-letters.edit",
  wellness_coach: "nav.commitment-letters",
  assistant_wellness_coach: "nav.commitment-letters",
});

router.get("/pending", view, listCoachPendingCommitmentLettersController);
router.get("/", view, listCoachCommitmentLettersController);
router.get("/:id", view, getCoachCommitmentLetterByIdController);
router.patch("/:id/review", write, reviewCoachCommitmentLetterController);
router.delete(
  "/:id",
  authorizeStaff("console.pt.edit", { admin: "commitment-letters.delete", wellness_coach: "nav.commitment-letters" }),
  deleteCoachCommitmentLetterController
);

module.exports = router;
