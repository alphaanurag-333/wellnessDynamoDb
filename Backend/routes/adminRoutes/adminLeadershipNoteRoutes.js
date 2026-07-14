const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { optionalLeadershipNotesFile } = require("../../middleware/authMultipart");
const {
  listLeadershipNotesController,
  getLeadershipNoteByIdController,
  createLeadershipNoteController,
  updateLeadershipNoteController,
  deleteLeadershipNoteController,
} = require("../../controllers/adminController/leadershipNoteController");

const router = express.Router();

router.get("/", protectAdmin, listLeadershipNotesController);
router.get("/:id", protectAdmin, getLeadershipNoteByIdController);
router.post("/", protectAdmin, optionalLeadershipNotesFile, createLeadershipNoteController);
router.patch("/:id", protectAdmin, optionalLeadershipNotesFile, updateLeadershipNoteController);
router.delete("/:id", protectAdmin, deleteLeadershipNoteController);

module.exports = router;
