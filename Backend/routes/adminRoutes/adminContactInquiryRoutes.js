const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const {
  listContactInquiriesController,
  getContactInquiryByIdController,
  updateContactInquiryController,
  deleteContactInquiryController,
} = require("../../controllers/adminController/contactInquiryController");

const router = express.Router();

router.get("/", protectAdmin, listContactInquiriesController);
router.get("/:id", protectAdmin, getContactInquiryByIdController);
router.patch("/:id", protectAdmin, updateContactInquiryController);
router.delete("/:id", protectAdmin, deleteContactInquiryController);

module.exports = router;
