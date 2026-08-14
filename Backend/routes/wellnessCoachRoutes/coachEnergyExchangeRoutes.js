const express = require("express");
const { protectAccount, requireActiveRole } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listProgramsForUserController,
  createProgramController,
  getProgramController,
  updateProgramController,
  enableProgramController,
  disableProgramController,
  previewProgramController,
  getEnergyExchangeForUserController,
} = require("../../controllers/staff/energyExchangeProgramController");

const router = express.Router();

router.use(
  protectAccount,
  requireActiveRole("admin", "wellness_coach"),
  authorizeStaff("console.pg.view", {
    admin: "energy-exchange.transactions.view",
    wellness_coach: "nav.my-users",
  })
);

router.get("/programs", listProgramsForUserController);
router.post("/programs", createProgramController);
router.get("/programs/:id", getProgramController);
router.patch("/programs/:id", updateProgramController);
router.post("/programs/:id/enable", enableProgramController);
router.post("/programs/:id/disable", disableProgramController);
router.get("/programs/:id/preview", previewProgramController);

router.get("/heal-users/:userId", getEnergyExchangeForUserController);

module.exports = router;
