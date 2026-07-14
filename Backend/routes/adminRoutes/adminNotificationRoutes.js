const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
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

router.get("/", protectAdmin, authorize("notifications.view"), listNotificationsController);
router.get("/:id", protectAdmin, authorize("notifications.view"), getNotificationByIdController);
router.post(
  "/",
  protectAdmin,
  authorize("notifications.edit"),
  optionalNotificationFile,
  createNotificationController
);
router.post("/:id/resend", protectAdmin, authorize("notifications.edit"), resendNotificationController);
router.patch(
  "/:id",
  protectAdmin,
  authorize("notifications.edit"),
  optionalNotificationFile,
  updateNotificationController
);
router.delete("/:id", protectAdmin, authorize("notifications.delete"), deleteNotificationController);

module.exports = router;
