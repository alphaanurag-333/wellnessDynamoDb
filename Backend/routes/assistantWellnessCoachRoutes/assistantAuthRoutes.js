const express = require("express");

const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const { optionalAssistantWellnessCoachFile } = require("../../middleware/authMultipart");
const {
  loginAssistantWellnessCoach,
  refreshAssistantWellnessCoachToken,
  getAssistantWellnessCoachProfile,
  updateAssistantWellnessCoachProfile,
  changeAssistantWellnessCoachPassword,
} = require("../../controllers/assistantWellnessCoachController/authController");

const router = express.Router();

router.post("/login", loginAssistantWellnessCoach);
router.post("/refresh-token", refreshAssistantWellnessCoachToken);

router.get("/me", protectAssistantWellnessCoach, getAssistantWellnessCoachProfile);
router.patch("/me", protectAssistantWellnessCoach, optionalAssistantWellnessCoachFile, updateAssistantWellnessCoachProfile);
router.patch("/me/password", protectAssistantWellnessCoach, changeAssistantWellnessCoachPassword);

module.exports = router;
