const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const {
  listBirthdayNotificationsController,
  getBirthdayNotificationByIdController,
  resendBirthdayNotificationController,
  runBirthdayJobController,
} = require("../../controllers/adminController/birthdayNotificationController");

const router = express.Router();

router.get("/", protectAdmin, listBirthdayNotificationsController);
router.post("/jobs/run", protectAdmin, runBirthdayJobController);
router.get("/:id", protectAdmin, getBirthdayNotificationByIdController);
router.post("/:id/resend", protectAdmin, resendBirthdayNotificationController);

module.exports = router;
