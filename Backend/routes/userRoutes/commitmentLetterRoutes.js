const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier } = require("../../middleware/tierGuards");
const { optionalUserFile } = require("../../middleware/authMultipart");
const {
  getUserCommitmentLetterTemplateController,
  getUserCommitmentLetterController,
  submitUserCommitmentLetterController,
  resubmitUserCommitmentLetterController,
} = require("../../controllers/userController/commitmentLetterController");

const router = express.Router();

router.get("/template", protectUser, requireHealTier, getUserCommitmentLetterTemplateController);
router.get("/", protectUser, requireHealTier, getUserCommitmentLetterController);
router.post("/", protectUser, requireHealTier, optionalUserFile, submitUserCommitmentLetterController);
router.patch("/", protectUser, requireHealTier, optionalUserFile, resubmitUserCommitmentLetterController);

module.exports = router;
