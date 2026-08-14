const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
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
router.get("/assistants", protectAccount, authorizeStaff("console.tm.view", { admin: "awcs.view" }), listAllAssistantsController);

// Wellness Coach CRUD -> `coaches.*`.
router.get("/", protectAccount, authorizeStaff("console.tm.view", { admin: "coaches.view" }), listWellnessCoachesController);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.tm.edit", { admin: "coaches.edit" }),
  optionalWellnessCoachFile,
  createWellnessCoachController
);
router.get("/:id", protectAccount, authorizeStaff("console.tm.view", { admin: "coaches.view" }), getWellnessCoachByIdController);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.tm.edit", { admin: "coaches.edit" }),
  optionalWellnessCoachFile,
  updateWellnessCoachController
);
router.delete("/:id", protectAccount, authorizeStaff("console.tm.delete", { admin: "coaches.delete" }), deleteWellnessCoachController);

router.get("/:coachId/assistants", protectAccount, authorizeStaff("console.tm.view", { admin: "awcs.view" }), listAssistantsController);
router.get("/:coachId/heal-users", protectAccount, authorizeStaff("console.tm.view", { admin: "coaches.view" }), listHealUsersByCoachController);
router.post(
  "/:coachId/assistants",
  protectAccount,
  authorizeStaff("console.tm.edit", { admin: "awcs.edit" }),
  optionalAssistantWellnessCoachFile,
  createAssistantController
);
router.get("/:coachId/assistants/:id", protectAccount, authorizeStaff("console.tm.view", { admin: "awcs.view" }), getAssistantByIdController);
router.patch(
  "/:coachId/assistants/:id",
  protectAccount,
  authorizeStaff("console.tm.edit", { admin: "awcs.edit" }),
  optionalAssistantWellnessCoachFile,
  updateAssistantController
);
router.delete("/:coachId/assistants/:id", protectAccount, authorizeStaff("console.tm.delete", { admin: "awcs.delete" }), deleteAssistantController);

module.exports = router;
