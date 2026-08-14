const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalLeadershipNotesFile } = require("../../middleware/authMultipart");
const {
  listLeadershipNotesController,
  getLeadershipNoteByIdController,
  createLeadershipNoteController,
  updateLeadershipNoteController,
  deleteLeadershipNoteController,
} = require("../../controllers/adminController/leadershipNoteController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.ct.view", { admin: "leadership-notes.view" }), listLeadershipNotesController);
router.get("/:id", protectAccount, authorizeStaff("console.ct.view", { admin: "leadership-notes.view" }), getLeadershipNoteByIdController);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.ct.edit", { admin: "leadership-notes.edit" }),
  optionalLeadershipNotesFile,
  createLeadershipNoteController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.ct.edit", { admin: "leadership-notes.edit" }),
  optionalLeadershipNotesFile,
  updateLeadershipNoteController
);
router.delete("/:id", protectAccount, authorizeStaff("console.ct.delete", { admin: "leadership-notes.delete" }), deleteLeadershipNoteController);

module.exports = router;
