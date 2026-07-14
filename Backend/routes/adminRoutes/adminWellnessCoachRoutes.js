const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
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

// Assistant Coach sub-resource -> `awcs.*` (matches the "awcs" nav leaf).
router.get("/assistants", protectAdmin, authorize("awcs.view"), listAllAssistantsController);

// Wellness Coach CRUD -> `coaches.*`.
router.get("/", protectAdmin, authorize("coaches.view"), listWellnessCoachesController);
router.post(
  "/",
  protectAdmin,
  authorize("coaches.edit"),
  optionalWellnessCoachFile,
  createWellnessCoachController
);
router.get("/:id", protectAdmin, authorize("coaches.view"), getWellnessCoachByIdController);
router.patch(
  "/:id",
  protectAdmin,
  authorize("coaches.edit"),
  optionalWellnessCoachFile,
  updateWellnessCoachController
);
router.delete("/:id", protectAdmin, authorize("coaches.delete"), deleteWellnessCoachController);

router.get("/:coachId/assistants", protectAdmin, authorize("awcs.view"), listAssistantsController);
router.get("/:coachId/heal-users", protectAdmin, authorize("coaches.view"), listHealUsersByCoachController);
router.post(
  "/:coachId/assistants",
  protectAdmin,
  authorize("awcs.edit"),
  optionalAssistantWellnessCoachFile,
  createAssistantController
);
router.get("/:coachId/assistants/:id", protectAdmin, authorize("awcs.view"), getAssistantByIdController);
router.patch(
  "/:coachId/assistants/:id",
  protectAdmin,
  authorize("awcs.edit"),
  optionalAssistantWellnessCoachFile,
  updateAssistantController
);
router.delete("/:coachId/assistants/:id", protectAdmin, authorize("awcs.delete"), deleteAssistantController);

module.exports = router;
