const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listAdminCommitmentLettersController,
  getAdminCommitmentLetterByIdController,
  reviewAdminCommitmentLetterController,
  deleteAdminCommitmentLetterController,
} = require("../../controllers/adminController/commitmentLetterController");

const router = express.Router();

router.get("/", protectAdmin, authorize("commitment-letters.view"), listAdminCommitmentLettersController);
router.get(
  "/:id",
  protectAdmin,
  authorize("commitment-letters.view"),
  getAdminCommitmentLetterByIdController
);
router.patch(
  "/:id/review",
  protectAdmin,
  authorize("commitment-letters.edit"),
  reviewAdminCommitmentLetterController
);
router.delete(
  "/:id",
  protectAdmin,
  authorize("commitment-letters.delete"),
  deleteAdminCommitmentLetterController
);

module.exports = router;
