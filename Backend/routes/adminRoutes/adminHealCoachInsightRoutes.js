const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  getAdminUserCoachInsightController,
  upsertAdminUserCoachInsightController,
} = require("../../controllers/adminController/healUser/coachInsightController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/coach-insight",
  protectAdmin,
  authorize("users.clientHub.care.coach-message"),
  getAdminUserCoachInsightController
);
router.put(
  "/:userId/coach-insight",
  protectAdmin,
  authorize("users.clientHub.care.coach-message"),
  upsertAdminUserCoachInsightController
);

module.exports = router;
