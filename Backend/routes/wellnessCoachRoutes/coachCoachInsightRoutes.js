const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  getCoachUserCoachInsightController,
  upsertCoachUserCoachInsightController,
} = require("../../controllers/wellnessCoachController/coachInsightController");

const router = express.Router({ mergeParams: true });

router.get("/:userId/coach-insight", protectWellnessCoach, getCoachUserCoachInsightController);
router.put("/:userId/coach-insight", protectWellnessCoach, upsertCoachUserCoachInsightController);

module.exports = router;
