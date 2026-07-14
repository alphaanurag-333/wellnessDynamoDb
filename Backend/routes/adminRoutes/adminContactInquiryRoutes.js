const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listContactInquiriesController,
  getContactInquiryByIdController,
  updateContactInquiryController,
  deleteContactInquiryController,
} = require("../../controllers/adminController/contactInquiryController");

const router = express.Router();

router.get("/", protectAdmin, authorize("contact-inquiries.view"), listContactInquiriesController);
router.get("/:id", protectAdmin, authorize("contact-inquiries.view"), getContactInquiryByIdController);
router.patch("/:id", protectAdmin, authorize("contact-inquiries.edit"), updateContactInquiryController);
router.delete("/:id", protectAdmin, authorize("contact-inquiries.delete"), deleteContactInquiryController);

module.exports = router;
