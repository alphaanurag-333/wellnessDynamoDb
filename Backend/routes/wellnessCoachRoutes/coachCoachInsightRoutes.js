const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  getCoachUserCoachInsightController,
  upsertCoachUserCoachInsightController,
} = require("../../controllers/wellnessCoachController/coachInsightController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/coach-insight", protectWellnessCoach, authorize("clientTab.care.coach-message"), getCoachUserCoachInsightController);
router.put("/:userId/coach-insight", protectWellnessCoach, authorize("clientTab.care.coach-message"), upsertCoachUserCoachInsightController);

module.exports = router;
