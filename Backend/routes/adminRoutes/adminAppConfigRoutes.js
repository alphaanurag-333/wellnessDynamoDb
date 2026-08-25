const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { uploadAppConfigFiles } = require("../../middleware/authMultipart");
const appConfigController = require("../../controllers/adminController/appConfigController");

const router = express.Router();

// Branding (logo, app name, favicon) is needed by every authenticated admin for
// the shell — keep GET open. Mutations stay behind settings.edit.
router.get("/", protectAccount, appConfigController.getAppConfigController);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "settings.edit" }),
  uploadAppConfigFiles,
  appConfigController.createAppConfigController
);
router.patch(
  "/",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "settings.edit" }),
  uploadAppConfigFiles,
  appConfigController.updateAppConfigController
);

router.post(
  "/commitment-letter/remind-whatsapp",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "settings.edit" }),
  appConfigController.remindCommitmentLetterWhatsAppController
);

module.exports = router;
