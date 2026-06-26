const express = require("express");
const { protectUser } = require("../../middleware/auth");
const {
  listMyNotificationsController,
  getMyUnreadCountController,
  getMyNotificationByIdController,
  markNotificationReadController,
  markAllNotificationsReadController,
} = require("../../controllers/userController/notificationController");

const router = express.Router();

router.use(protectUser);

router.get("/", listMyNotificationsController);
router.get("/unread-count", getMyUnreadCountController);
router.post("/read-all", markAllNotificationsReadController);
router.get("/:id", getMyNotificationByIdController);
router.patch("/:id/read", markNotificationReadController);

module.exports = router;
