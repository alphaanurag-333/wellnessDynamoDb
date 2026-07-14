const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listBirthdayNotificationsController,
  getBirthdayNotificationByIdController,
  resendBirthdayNotificationController,
  runBirthdayJobController,
} = require("../../controllers/adminController/birthdayNotificationController");

const router = express.Router();

router.get("/", protectAdmin, authorize("birthday-notifications.view"), listBirthdayNotificationsController);
router.post("/jobs/run", protectAdmin, authorize("birthday-notifications.edit"), runBirthdayJobController);
router.get(
  "/:id",
  protectAdmin,
  authorize("birthday-notifications.view"),
  getBirthdayNotificationByIdController
);
router.post(
  "/:id/resend",
  protectAdmin,
  authorize("birthday-notifications.edit"),
  resendBirthdayNotificationController
);

module.exports = router;
