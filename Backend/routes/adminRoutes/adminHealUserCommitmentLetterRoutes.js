const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { requireClientAccess } = require("../../middleware/requireClientAccess");
const { authorize } = require("../../middleware/authorize");
const {
  getAdminUserCommitmentLetterController,
} = require("../../controllers/adminController/healUser/commitmentLetterController.js");

const router = express.Router({ mergeParams: true });

router.get("/:userId/commitment-letter", protectAdmin, requireClientAccess, authorize("users.clientHub.care.commitment-letter"), getAdminUserCommitmentLetterController);

module.exports = router;
