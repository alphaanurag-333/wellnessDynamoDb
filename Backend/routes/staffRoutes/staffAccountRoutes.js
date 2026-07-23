const express = require("express");

const { protectStaff } = require("../../middleware/auth");
const { requireSuperAdmin } = require("../../middleware/authorize");
const { optionalStaffAccountFile } = require("../../middleware/authMultipart");
const {
  listStaffAccountsController,
  getStaffAccountByIdController,
  createStaffAccountController,
  updateStaffAccountController,
  deleteStaffAccountController,
} = require("../../controllers/staffController/staffAccountController");

const router = express.Router();

// Super Admin only — create/manage Admin, Wellness Coach and Assistant
// Wellness Coach accounts from one unified surface. `accountType` is passed
// via `?accountType=` (list) or `body.accountType` (create).
router.use(protectStaff(), requireSuperAdmin);

router.get("/", listStaffAccountsController);
router.get("/:id", getStaffAccountByIdController);
router.post("/", optionalStaffAccountFile, createStaffAccountController);
router.patch("/:id", optionalStaffAccountFile, updateStaffAccountController);
router.delete("/:id", deleteStaffAccountController);

module.exports = router;
