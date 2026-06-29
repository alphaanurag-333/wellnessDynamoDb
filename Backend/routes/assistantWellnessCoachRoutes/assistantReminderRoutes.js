const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listAssistantUserRemindersController,
  createAssistantUserReminderController,
  updateAssistantUserReminderController,
  toggleAssistantUserReminderController,
  deleteAssistantUserReminderController,
} = require("../../controllers/assistantWellnessCoachController/reminderController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/reminders", protectAssistantWellnessCoach, listAssistantUserRemindersController);
router.post("/:userId/reminders", protectAssistantWellnessCoach, createAssistantUserReminderController);
router.put("/:userId/reminders/:reminderId", protectAssistantWellnessCoach, updateAssistantUserReminderController);
router.patch(
  "/:userId/reminders/:reminderId/toggle",
  protectAssistantWellnessCoach,
  toggleAssistantUserReminderController
);
router.delete(
  "/:userId/reminders/:reminderId",
  protectAssistantWellnessCoach,
  deleteAssistantUserReminderController
);

module.exports = router;
