const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCatalogForCoachController,
  listProgramsForUserController,
  createProgramAssignmentController,
  updateProgramAssignmentController,
  enableProgramAssignmentController,
  disableProgramAssignmentController,
  getProgramForClientController,
} = require("../../controllers/wellnessCoachController/userProgramController");

const router = express.Router();

router.use(protectWellnessCoach);

router.get("/catalog", listCatalogForCoachController);
router.get("/clients/:userId", getProgramForClientController);
router.get("/", listProgramsForUserController);
router.post("/", createProgramAssignmentController);
router.patch("/:id", updateProgramAssignmentController);
router.post("/:id/enable", enableProgramAssignmentController);
router.post("/:id/disable", disableProgramAssignmentController);

module.exports = router;
