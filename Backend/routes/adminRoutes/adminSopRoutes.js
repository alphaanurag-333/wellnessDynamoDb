const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listSopsController,
  getSopByIdController,
  createSopController,
  updateSopController,
  deleteSopController,
} = require("../../controllers/adminController/sopController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.sop.view", { admin: "sops.view" }), listSopsController);
router.get("/:id", protectAccount, authorizeStaff("console.sop.view", { admin: "sops.view" }), getSopByIdController);
router.post("/", protectAccount, authorizeStaff("console.sop.create", { admin: "sops.edit" }), createSopController);
router.patch("/:id", protectAccount, authorizeStaff("console.sop.edit", { admin: "sops.edit" }), updateSopController);
router.delete("/:id", protectAccount, authorizeStaff("console.sop.delete", { admin: "sops.delete" }), deleteSopController);

module.exports = router;
