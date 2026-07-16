const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalAssistantWellnessCoachFile } = require("../../middleware/authMultipart");
const {
  listMyAssistantsController,
  getMyAssistantCountController,
  getMyAssistantController,
  createMyAssistantController,
  updateMyAssistantController,
  deleteMyAssistantController,
} = require("../../controllers/wellnessCoachController/assistantController");

const router = express.Router();

router.use(protectWellnessCoach, authorize("nav.my-assistants"));

router.get("/", listMyAssistantsController);
router.get("/count", getMyAssistantCountController);
router.get("/:id", getMyAssistantController);
router.post("/", optionalAssistantWellnessCoachFile, createMyAssistantController);
router.patch("/:id", optionalAssistantWellnessCoachFile, updateMyAssistantController);
router.delete("/:id", deleteMyAssistantController);

module.exports = router;
