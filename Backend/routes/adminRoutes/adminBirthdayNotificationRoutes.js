const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listBirthdayNotificationsController,
  getBirthdayNotificationByIdController,
  resendBirthdayNotificationController,
  runBirthdayJobController,
} = require("../../controllers/adminController/birthdayNotificationController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.ct.view", { admin: "birthday-notifications.view" }), listBirthdayNotificationsController);
router.post("/jobs/run", protectAccount, authorizeStaff("console.ct.edit", { admin: "birthday-notifications.edit" }), runBirthdayJobController);
router.get(
  "/:id",
  protectAccount,
  authorizeStaff("console.ct.view", { admin: "birthday-notifications.view" }),
  getBirthdayNotificationByIdController
);
router.post(
  "/:id/resend",
  protectAccount,
  authorizeStaff("console.ct.edit", { admin: "birthday-notifications.edit" }),
  resendBirthdayNotificationController
);

module.exports = router;
