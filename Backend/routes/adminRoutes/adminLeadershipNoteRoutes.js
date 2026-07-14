const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalLeadershipNotesFile } = require("../../middleware/authMultipart");
const {
  listLeadershipNotesController,
  getLeadershipNoteByIdController,
  createLeadershipNoteController,
  updateLeadershipNoteController,
  deleteLeadershipNoteController,
} = require("../../controllers/adminController/leadershipNoteController");

const router = express.Router();

router.get("/", protectAdmin, authorize("leadership-notes.view"), listLeadershipNotesController);
router.get("/:id", protectAdmin, authorize("leadership-notes.view"), getLeadershipNoteByIdController);
router.post(
  "/",
  protectAdmin,
  authorize("leadership-notes.edit"),
  optionalLeadershipNotesFile,
  createLeadershipNoteController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("leadership-notes.edit"),
  optionalLeadershipNotesFile,
  updateLeadershipNoteController
);
router.delete("/:id", protectAdmin, authorize("leadership-notes.delete"), deleteLeadershipNoteController);

module.exports = router;
