const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const {
  optionalWellnessCoachFile,
  optionalAssistantWellnessCoachFile,
} = require("../../middleware/authMultipart");
const {
  listWellnessCoachesController,
  getWellnessCoachByIdController,
  createWellnessCoachController,
  updateWellnessCoachController,
  deleteWellnessCoachController,
} = require("../../controllers/adminController/wellnessCoachController");
const {
  listAssistantsController,
  listAllAssistantsController,
  getAssistantByIdController,
  createAssistantController,
  updateAssistantController,
  deleteAssistantController,
} = require("../../controllers/adminController/assistantWellnessCoachController");
const { listHealUsersByCoachController } = require("../../controllers/adminController/userAssignmentController");

const router = express.Router();

router.get("/assistants", protectAdmin, listAllAssistantsController);

router.get("/", protectAdmin, listWellnessCoachesController);
router.post("/", protectAdmin, optionalWellnessCoachFile, createWellnessCoachController);
router.get("/:id", protectAdmin, getWellnessCoachByIdController);
router.patch("/:id", protectAdmin, optionalWellnessCoachFile, updateWellnessCoachController);
router.delete("/:id", protectAdmin, deleteWellnessCoachController);

router.get("/:coachId/assistants", protectAdmin, listAssistantsController);
router.get("/:coachId/heal-users", protectAdmin, listHealUsersByCoachController);
router.post("/:coachId/assistants", protectAdmin, optionalAssistantWellnessCoachFile, createAssistantController);
router.get("/:coachId/assistants/:id", protectAdmin, getAssistantByIdController);
router.patch("/:coachId/assistants/:id", protectAdmin, optionalAssistantWellnessCoachFile, updateAssistantController);
router.delete("/:coachId/assistants/:id", protectAdmin, deleteAssistantController);

module.exports = router;
