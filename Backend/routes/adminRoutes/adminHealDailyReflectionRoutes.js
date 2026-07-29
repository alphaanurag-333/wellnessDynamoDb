const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { requireClientAccess } = require("../../middleware/requireClientAccess");
const { authorize } = require("../../middleware/authorize");
const {
  getAdminUserDailyReflectionSettingsController,
  updateAdminUserDailyReflectionSettingsController,
  getAdminUserDailyReflectionHistoryController,
} = require("../../controllers/adminController/healUser/dailyReflectionController.js");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/daily-reflection-settings",
  protectAdmin, requireClientAccess, authorize("users.clientHub.wellness.daily-reflection"),
  getAdminUserDailyReflectionSettingsController
);
router.patch(
  "/:userId/daily-reflection-settings",
  protectAdmin, requireClientAccess, authorize("users.clientHub.wellness.daily-reflection"),
  updateAdminUserDailyReflectionSettingsController
);
router.get(
  "/:userId/daily-reflection/history",
  protectAdmin, requireClientAccess, authorize("users.clientHub.wellness.daily-reflection"),
  getAdminUserDailyReflectionHistoryController
);

module.exports = router;
