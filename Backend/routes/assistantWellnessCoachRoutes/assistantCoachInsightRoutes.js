const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  getAssistantUserCoachInsightController,
  upsertAssistantUserCoachInsightController,
} = require("../../controllers/assistantWellnessCoachController/coachInsightController");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/coach-insight",
  protectAssistantWellnessCoach,
  getAssistantUserCoachInsightController
);
router.put(
  "/:userId/coach-insight",
  protectAssistantWellnessCoach,
  upsertAssistantUserCoachInsightController
);

module.exports = router;
