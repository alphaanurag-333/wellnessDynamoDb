const express = require("express");
const { protectUser } = require("../../middleware/auth");
const {
  listMyRemindersController,
  createMyReminderController,
  updateMyReminderController,
  toggleMyReminderController,
  deleteMyReminderController,
} = require("../../controllers/userController/reminderController");

const router = express.Router();

router.use(protectUser);

router.get("/", listMyRemindersController);
router.post("/", createMyReminderController);
router.put("/:id", updateMyReminderController);
router.patch("/:id/toggle", toggleMyReminderController);
router.delete("/:id", deleteMyReminderController);

module.exports = router;
