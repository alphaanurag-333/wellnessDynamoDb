const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCoachUserRemindersController,
  createCoachUserReminderController,
  updateCoachUserReminderController,
  toggleCoachUserReminderController,
  deleteCoachUserReminderController,
} = require("../../controllers/wellnessCoachController/reminderController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/reminders", protectWellnessCoach, listCoachUserRemindersController);
router.post("/:userId/reminders", protectWellnessCoach, createCoachUserReminderController);
router.put("/:userId/reminders/:reminderId", protectWellnessCoach, updateCoachUserReminderController);
router.patch("/:userId/reminders/:reminderId/toggle", protectWellnessCoach, toggleCoachUserReminderController);
router.delete("/:userId/reminders/:reminderId", protectWellnessCoach, deleteCoachUserReminderController);

module.exports = router;
