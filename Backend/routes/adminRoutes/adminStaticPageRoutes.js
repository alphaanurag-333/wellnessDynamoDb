const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listPagesController,
  getPageByIdController,
  createPageController,
  updatePageController,
  deletePageController,
} = require("../../controllers/adminController/staticPageController");

const router = express.Router();

// Static Pages has no View action in the list UI — open with edit or delete.
router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: ["static-pages.edit", "static-pages.delete"] }), listPagesController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: ["static-pages.edit", "static-pages.delete"] }), getPageByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "static-pages.edit" }), createPageController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "static-pages.edit" }), updatePageController);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "static-pages.delete" }), deletePageController);

module.exports = router;
