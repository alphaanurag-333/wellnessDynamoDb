const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier, forbidEagleClient } = require("../../middleware/tierGuards");
const {
  listUserOnboardingMeetingsController,
  bookUserOnboardingMeetingController,
  requestUserOnboardingMeetingTimeController,
} = require("../../controllers/userController/onboardingMeetingController");

const router = express.Router();
router.use(protectUser, requireHealTier, forbidEagleClient);

router.get("/", listUserOnboardingMeetingsController);
router.post("/:meetingId/book", bookUserOnboardingMeetingController);
router.post("/:meetingId/request-time", requestUserOnboardingMeetingTimeController);

module.exports = router;
