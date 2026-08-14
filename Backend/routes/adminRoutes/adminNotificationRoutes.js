const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
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

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "notifications.view" }), listNotificationsController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "notifications.view" }), getNotificationByIdController);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "notifications.edit" }),
  optionalNotificationFile,
  createNotificationController
);
router.post("/:id/resend", protectAccount, authorizeStaff("console.cf.edit", { admin: "notifications.edit" }), resendNotificationController);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "notifications.edit" }),
  optionalNotificationFile,
  updateNotificationController
);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "notifications.delete" }), deleteNotificationController);

module.exports = router;
