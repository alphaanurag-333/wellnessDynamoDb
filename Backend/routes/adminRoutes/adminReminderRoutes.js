const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listAdminUserRemindersController,
  createAdminUserReminderController,
  updateAdminUserReminderController,
  toggleAdminUserReminderController,
  deleteAdminUserReminderController,
} = require("../../controllers/adminController/healUser/reminderController.js");

const router = express.Router({ mergeParams: true });

router.get("/:userId/reminders", protectAdmin, authorize("users.clientHub.care.reminders"), listAdminUserRemindersController);
router.post("/:userId/reminders", protectAdmin, authorize("users.clientHub.care.reminders"), createAdminUserReminderController);
router.put("/:userId/reminders/:reminderId", protectAdmin, authorize("users.clientHub.care.reminders"), updateAdminUserReminderController);
router.patch("/:userId/reminders/:reminderId/toggle", protectAdmin, authorize("users.clientHub.care.reminders"), toggleAdminUserReminderController);
router.delete("/:userId/reminders/:reminderId", protectAdmin, authorize("users.clientHub.care.reminders"), deleteAdminUserReminderController);

module.exports = router;
