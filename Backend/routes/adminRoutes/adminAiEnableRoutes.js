const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listAiEnableController,
  updateAiEnableController,
  bulkUpdateAiEnableController,
} = require("../../controllers/adminController/aiEnableController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "settings.view" }), listAiEnableController);
router.patch("/bulk", protectAccount, authorizeStaff("console.cf.edit", { admin: "settings.edit" }), bulkUpdateAiEnableController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "settings.edit" }), updateAiEnableController);

module.exports = router;
