const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const {
  listAdminCommitmentLettersController,
  getAdminCommitmentLetterByIdController,
  reviewAdminCommitmentLetterController,
  deleteAdminCommitmentLetterController,
} = require("../../controllers/adminController/commitmentLetterController");

const router = express.Router();

router.get("/", protectAdmin, listAdminCommitmentLettersController);
router.get("/:id", protectAdmin, getAdminCommitmentLetterByIdController);
router.patch("/:id/review", protectAdmin, reviewAdminCommitmentLetterController);
router.delete("/:id", protectAdmin, deleteAdminCommitmentLetterController);

module.exports = router;
