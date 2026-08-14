const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listHealthDisordersController,
  getHealthDisorderByIdController,
  createHealthDisorderController,
  updateHealthDisorderController,
  deleteHealthDisorderController,
} = require("../../controllers/adminController/healthDisorderController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "health-disorders.view" }), listHealthDisordersController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "health-disorders.view" }), getHealthDisorderByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "health-disorders.edit" }), createHealthDisorderController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "health-disorders.edit" }), updateHealthDisorderController);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "health-disorders.delete" }), deleteHealthDisorderController);

module.exports = router;
