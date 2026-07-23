const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listCoachUserRemindersController,
  createCoachUserReminderController,
  updateCoachUserReminderController,
  toggleCoachUserReminderController,
  deleteCoachUserReminderController,
} = require("../../controllers/wellnessCoachController/reminderController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/reminders", protectWellnessCoach, authorize("clientHub.care.reminders"), listCoachUserRemindersController);
router.post("/:userId/reminders", protectWellnessCoach, authorize("clientHub.care.reminders"), createCoachUserReminderController);
router.put("/:userId/reminders/:reminderId", protectWellnessCoach, authorize("clientHub.care.reminders"), updateCoachUserReminderController);
router.patch("/:userId/reminders/:reminderId/toggle", protectWellnessCoach, authorize("clientHub.care.reminders"), toggleCoachUserReminderController);
router.delete("/:userId/reminders/:reminderId", protectWellnessCoach, authorize("clientHub.care.reminders"), deleteCoachUserReminderController);

module.exports = router;
