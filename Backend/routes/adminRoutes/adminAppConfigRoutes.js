const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { uploadAppConfigFiles } = require("../../middleware/authMultipart");
const appConfigController = require("../../controllers/adminController/appConfigController");

const router = express.Router();

router.get("/", protectAdmin, appConfigController.getAppConfigController);
router.post("/", protectAdmin, uploadAppConfigFiles, appConfigController.createAppConfigController);
router.patch("/", protectAdmin, uploadAppConfigFiles, appConfigController.updateAppConfigController);

module.exports = router;
