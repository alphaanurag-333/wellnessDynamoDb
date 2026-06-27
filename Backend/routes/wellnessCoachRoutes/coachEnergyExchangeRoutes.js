const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listProgramsForUserController,
  createProgramController,
  getProgramController,
  updateProgramController,
  enableProgramController,
  disableProgramController,
  previewProgramController,
  getEnergyExchangeForUserController,
} = require("../../controllers/wellnessCoachController/energyExchangeProgramController");

const router = express.Router();

router.use(protectWellnessCoach);

router.get("/programs", listProgramsForUserController);
router.post("/programs", createProgramController);
router.get("/programs/:id", getProgramController);
router.patch("/programs/:id", updateProgramController);
router.post("/programs/:id/enable", enableProgramController);
router.post("/programs/:id/disable", disableProgramController);
router.get("/programs/:id/preview", previewProgramController);

router.get("/heal-users/:userId", getEnergyExchangeForUserController);

module.exports = router;
