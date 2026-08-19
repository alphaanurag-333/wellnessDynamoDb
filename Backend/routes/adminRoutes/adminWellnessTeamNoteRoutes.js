const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalWellnessTeamNotesFile } = require("../../middleware/authMultipart");
const {
  listWellnessTeamNotesController,
  getWellnessTeamNoteByIdController,
  createWellnessTeamNoteController,
  updateWellnessTeamNoteController,
  deleteWellnessTeamNoteController,
} = require("../../controllers/adminController/wellnessTeamNoteController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.ct.view", { admin: "wellness-team-notes.view" }), listWellnessTeamNotesController);
router.get("/:id", protectAccount, authorizeStaff("console.ct.view", { admin: "wellness-team-notes.view" }), getWellnessTeamNoteByIdController);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.ct.edit", { admin: "wellness-team-notes.edit" }),
  optionalWellnessTeamNotesFile,
  createWellnessTeamNoteController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.ct.edit", { admin: "wellness-team-notes.edit" }),
  optionalWellnessTeamNotesFile,
  updateWellnessTeamNoteController
);
router.delete("/:id", protectAccount, authorizeStaff("console.ct.delete", { admin: "wellness-team-notes.delete" }), deleteWellnessTeamNoteController);

module.exports = router;
