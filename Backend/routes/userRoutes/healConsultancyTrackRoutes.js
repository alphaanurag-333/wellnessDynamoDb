const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier } = require("../../middleware/tierGuards");
const {
  createMyHealConsultancyTrackController,
  listMyHealConsultancyTracksController,
} = require("../../controllers/userController/healConsultancyTrackController");

const router = express.Router();

router.use(protectUser, requireHealTier);

router.get("/", listMyHealConsultancyTracksController);
router.post("/", createMyHealConsultancyTrackController);

module.exports = router;
