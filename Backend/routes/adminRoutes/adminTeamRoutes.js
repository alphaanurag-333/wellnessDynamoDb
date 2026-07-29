const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalAdminFile } = require("../../middleware/authMultipart");
const {
  listTeamMembersController,
  listTeamRoleOptionsController,
  listTeamParentsController,
  getTeamMemberByIdController,
  createTeamMemberController,
  updateTeamMemberController,
  updateTeamMemberStatusController,
  deleteTeamMemberController,
} = require("../../controllers/adminController/teamController");

const router = express.Router();

router.use(protectAdmin);

router.get("/", authorize("team.view"), listTeamMembersController);
router.get("/roles", authorize("team.view"), listTeamRoleOptionsController);
router.get("/parents", authorize("team.view"), listTeamParentsController);
router.get("/:id", authorize("team.view"), getTeamMemberByIdController);
router.post("/", authorize("team.edit"), optionalAdminFile, createTeamMemberController);
router.patch("/:id", authorize("team.edit"), optionalAdminFile, updateTeamMemberController);
router.patch("/:id/status", authorize("team.edit"), updateTeamMemberStatusController);
router.delete("/:id", authorize("team.delete"), deleteTeamMemberController);

module.exports = router;
