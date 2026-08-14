const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listFaqsController,
  getFaqByIdController,
  createFaqController,
  updateFaqController,
  reorderFaqsController,
  deleteFaqController,
} = require("../../controllers/adminController/faqController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "faq.view" }), listFaqsController);
router.put("/reorder", protectAccount, authorizeStaff("console.cf.edit", { admin: "faq.edit" }), reorderFaqsController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "faq.view" }), getFaqByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "faq.edit" }), createFaqController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "faq.edit" }), updateFaqController);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "faq.delete" }), deleteFaqController);

module.exports = router;
