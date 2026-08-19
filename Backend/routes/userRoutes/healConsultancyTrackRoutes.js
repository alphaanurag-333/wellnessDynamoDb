const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier } = require("../../middleware/tierGuards");
const {
  createMyHealConsultancyTrackController,
  listMyHealConsultancyTracksController,
  selectMyHealConsultancyPeriodController,
} = require("../../controllers/userController/healConsultancyTrackController");

const router = express.Router();

router.use(protectUser, requireHealTier);

router.get("/", listMyHealConsultancyTracksController);
router.post("/", createMyHealConsultancyTrackController);
router.patch("/:trackId/select-period", selectMyHealConsultancyPeriodController);

module.exports = router;
