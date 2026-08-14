const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listSpecializationsController,
  getSpecializationByIdController,
  createSpecializationController,
  updateSpecializationController,
  deleteSpecializationController,
} = require("../../controllers/adminController/specializationController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "specializations.view" }), listSpecializationsController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "specializations.view" }), getSpecializationByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "specializations.edit" }), createSpecializationController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "specializations.edit" }), updateSpecializationController);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "specializations.delete" }), deleteSpecializationController);

module.exports = router;
