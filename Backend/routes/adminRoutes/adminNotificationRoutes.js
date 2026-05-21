const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { optionalNotificationFile } = require("../../middleware/authMultipart");
const {
  listNotificationsController,
  getNotificationByIdController,
  createNotificationController,
  updateNotificationController,
  resendNotificationController,
  deleteNotificationController,
} = require("../../controllers/adminController/notificationController");

const router = express.Router();

router.get("/", protectAdmin, listNotificationsController);
router.get("/:id", protectAdmin, getNotificationByIdController);
router.post("/", protectAdmin, optionalNotificationFile, createNotificationController);
router.post("/:id/resend", protectAdmin, resendNotificationController);
router.patch("/:id", protectAdmin, optionalNotificationFile, updateNotificationController);
router.delete("/:id", protectAdmin, deleteNotificationController);

module.exports = router;
