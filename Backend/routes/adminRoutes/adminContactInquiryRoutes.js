const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listContactInquiriesController,
  getContactInquiryByIdController,
  updateContactInquiryController,
  deleteContactInquiryController,
} = require("../../controllers/adminController/contactInquiryController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.ci.view", { admin: "contact-inquiries.view" }), listContactInquiriesController);
router.get("/:id", protectAccount, authorizeStaff("console.ci.view", { admin: "contact-inquiries.view" }), getContactInquiryByIdController);
router.patch("/:id", protectAccount, authorizeStaff("console.ci.edit", { admin: "contact-inquiries.edit" }), updateContactInquiryController);
router.delete("/:id", protectAccount, authorizeStaff("console.ci.delete", { admin: "contact-inquiries.delete" }), deleteContactInquiryController);

module.exports = router;
