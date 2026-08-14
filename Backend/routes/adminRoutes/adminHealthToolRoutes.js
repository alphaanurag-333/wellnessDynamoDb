const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalHealthToolFile } = require("../../middleware/authMultipart");
const {
  listHealthToolsController,
  getHealthToolByIdController,
  createHealthToolController,
  updateHealthToolController,
  deleteHealthToolController,
} = require("../../controllers/adminController/healthToolController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "health-tools.view" }), listHealthToolsController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "health-tools.view" }), getHealthToolByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "health-tools.edit" }), optionalHealthToolFile, createHealthToolController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "health-tools.edit" }), optionalHealthToolFile, updateHealthToolController);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "health-tools.delete" }), deleteHealthToolController);

module.exports = router;
