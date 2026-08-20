const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier, forbidEagleClient } = require("../../middleware/tierGuards");
const { optionalCommitmentLetterFile } = require("../../middleware/authMultipart");
const {
  getUserCommitmentLetterTemplateController,
  getUserCommitmentLetterController,
  submitUserCommitmentLetterController,
  resubmitUserCommitmentLetterController,
} = require("../../controllers/userController/commitmentLetterController");

const router = express.Router();

router.get("/template", protectUser, requireHealTier, forbidEagleClient, getUserCommitmentLetterTemplateController);
router.get("/", protectUser, requireHealTier, forbidEagleClient, getUserCommitmentLetterController);
router.post("/", protectUser, requireHealTier, forbidEagleClient, optionalCommitmentLetterFile, submitUserCommitmentLetterController);
router.patch("/", protectUser, requireHealTier, forbidEagleClient, optionalCommitmentLetterFile, resubmitUserCommitmentLetterController);

module.exports = router;
