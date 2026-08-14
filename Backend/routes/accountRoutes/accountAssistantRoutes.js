const express = require("express");
const { protectAccount, requireActiveRole } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalAssistantWellnessCoachFile } = require("../../middleware/authMultipart");
const {
  listMyAssistantsController,
  getMyAssistantCountController,
  getMyAssistantController,
  createMyAssistantController,
  updateMyAssistantController,
  deleteMyAssistantController,
} = require("../../controllers/adminController/assistantWellnessCoachController");

const router = express.Router();
router.use(protectAccount, requireActiveRole("admin", "wellness_coach"));

const view = authorizeStaff("console.tm.view", {
  admin: "awcs.view",
  wellness_coach: "nav.my-assistants",
});
const write = authorizeStaff("console.tm.edit", {
  admin: "awcs.edit",
  wellness_coach: "nav.my-assistants",
});

router.get("/", view, listMyAssistantsController);
router.get("/count", view, getMyAssistantCountController);
router.get("/:id", view, getMyAssistantController);
router.post("/", write, optionalAssistantWellnessCoachFile, createMyAssistantController);
router.patch("/:id", write, optionalAssistantWellnessCoachFile, updateMyAssistantController);
router.delete(
  "/:id",
  authorizeStaff("console.tm.delete", { admin: "awcs.delete", wellness_coach: "nav.my-assistants" }),
  deleteMyAssistantController
);

module.exports = router;
