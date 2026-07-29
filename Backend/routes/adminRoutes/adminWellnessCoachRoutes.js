const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize, authorizeAny } = require("../../middleware/authorize");
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

// Legacy coach/AWC APIs — permissions unified under team.* (coaches.*/awcs.* normalized in catalog).
router.get("/assistants", protectAdmin, authorize("team.view"), listAllAssistantsController);

router.get("/", protectAdmin, authorize("team.view"), listWellnessCoachesController);
router.post(
  "/",
  protectAdmin,
  authorize("team.edit"),
  optionalWellnessCoachFile,
  createWellnessCoachController
);
router.get("/:id", protectAdmin, authorize("team.view"), getWellnessCoachByIdController);
router.patch(
  "/:id",
  protectAdmin,
  authorize("team.edit"),
  optionalWellnessCoachFile,
  updateWellnessCoachController
);
router.delete("/:id", protectAdmin, authorize("team.delete"), deleteWellnessCoachController);

router.get(
  "/:coachId/assistants",
  protectAdmin,
  authorizeAny("team.view", "my-assistants.view"),
  listAssistantsController
);
router.get("/:coachId/heal-users", protectAdmin, authorize("team.view"), listHealUsersByCoachController);
router.post(
  "/:coachId/assistants",
  protectAdmin,
  authorizeAny("team.edit", "my-assistants.edit"),
  optionalAssistantWellnessCoachFile,
  createAssistantController
);
router.get(
  "/:coachId/assistants/:id",
  protectAdmin,
  authorizeAny("team.view", "my-assistants.view"),
  getAssistantByIdController
);
router.patch(
  "/:coachId/assistants/:id",
  protectAdmin,
  authorizeAny("team.edit", "my-assistants.edit"),
  optionalAssistantWellnessCoachFile,
  updateAssistantController
);
router.delete(
  "/:coachId/assistants/:id",
  protectAdmin,
  authorizeAny("team.delete", "my-assistants.delete"),
  deleteAssistantController
);

module.exports = router;
