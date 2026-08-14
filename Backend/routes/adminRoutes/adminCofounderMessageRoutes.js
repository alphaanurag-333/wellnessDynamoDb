const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalCofounderMessageFiles } = require("../../middleware/authMultipart");
const {
  getCofounderMessageController,
  createCofounderMessageController,
  updateCofounderMessageController,
} = require("../../controllers/adminController/cofounderMessageController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.ct.view", { admin: "cofounder-message.view" }), getCofounderMessageController);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.ct.edit", { admin: "cofounder-message.edit" }),
  optionalCofounderMessageFiles,
  createCofounderMessageController
);
router.patch(
  "/",
  protectAccount,
  authorizeStaff("console.ct.edit", { admin: "cofounder-message.edit" }),
  optionalCofounderMessageFiles,
  updateCofounderMessageController
);

module.exports = router;
