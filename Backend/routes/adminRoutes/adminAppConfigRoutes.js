const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { uploadAppConfigFiles } = require("../../middleware/authMultipart");
const appConfigController = require("../../controllers/adminController/appConfigController");

const router = express.Router();

// Branding (logo, app name, favicon) is needed by every authenticated admin for
// the shell — keep GET open. Mutations stay behind settings.edit.
router.get("/", protectAdmin, appConfigController.getAppConfigController);
router.post(
  "/",
  protectAdmin,
  authorize("settings.edit"),
  uploadAppConfigFiles,
  appConfigController.createAppConfigController
);
router.patch(
  "/",
  protectAdmin,
  authorize("settings.edit"),
  uploadAppConfigFiles,
  appConfigController.updateAppConfigController
);

module.exports = router;
