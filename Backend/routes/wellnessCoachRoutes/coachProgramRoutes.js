const express = require("express");
const { protectAccount, requireActiveRole } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listCatalogForCoachController,
  listProgramsForUserController,
  createProgramAssignmentController,
  updateProgramAssignmentController,
  enableProgramAssignmentController,
  disableProgramAssignmentController,
  getProgramForClientController,
} = require("../../controllers/staff/userProgramController");

const router = express.Router();

router.use(
  protectAccount,
  requireActiveRole("admin", "wellness_coach"),
  authorizeStaff("console.pg.view", {
    admin: "programs.edit",
    wellness_coach: "nav.my-users",
  })
);

router.get("/catalog", listCatalogForCoachController);
router.get("/clients/:userId", getProgramForClientController);
router.get("/", listProgramsForUserController);
router.post("/", createProgramAssignmentController);
router.patch("/:id", updateProgramAssignmentController);
router.post("/:id/enable", enableProgramAssignmentController);
router.post("/:id/disable", disableProgramAssignmentController);

module.exports = router;
