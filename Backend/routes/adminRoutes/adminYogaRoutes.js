const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalYogaFile } = require("../../middleware/authMultipart");
const {
  listYogaController,
  getYogaByIdController,
  createYogaController,
  updateYogaController,
  deleteYogaController,
} = require("../../controllers/adminController/yogaController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "yoga.view" }), listYogaController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "yoga.view" }), getYogaByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "yoga.edit" }), optionalYogaFile, createYogaController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "yoga.edit" }), optionalYogaFile, updateYogaController);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "yoga.delete" }), deleteYogaController);

module.exports = router;
