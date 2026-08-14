const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalSupplementFile } = require("../../middleware/authMultipart");
const {
  listSupplementsController,
  getSupplementByIdController,
  createSupplementController,
  updateSupplementController,
  deleteSupplementController,
} = require("../../controllers/adminController/supplementController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "supplements.view" }), listSupplementsController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "supplements.view" }), getSupplementByIdController);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "supplements.edit" }),
  optionalSupplementFile,
  createSupplementController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "supplements.edit" }),
  optionalSupplementFile,
  updateSupplementController
);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "supplements.delete" }), deleteSupplementController);

module.exports = router;
