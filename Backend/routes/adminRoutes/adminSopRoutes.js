const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalSopFiles } = require("../../middleware/authMultipart");
const {
  listSopsController,
  getSopByIdController,
  createSopController,
  updateSopController,
  deleteSopController,
} = require("../../controllers/adminController/sopController");

const router = express.Router();

// View, create, edit, delete, and file upload follow the SOP library grants.
router.get("/", protectAccount, authorizeStaff("console.sop.view", { admin: "sops.view" }), listSopsController);
router.get("/:id", protectAccount, authorizeStaff("console.sop.view", { admin: "sops.view" }), getSopByIdController);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.sop.create", { admin: "sops.edit" }),
  optionalSopFiles,
  createSopController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.sop.edit", { admin: "sops.edit" }),
  optionalSopFiles,
  updateSopController
);
router.delete(
  "/:id",
  protectAccount,
  authorizeStaff("console.sop.delete", { admin: "sops.delete" }),
  deleteSopController
);

module.exports = router;
