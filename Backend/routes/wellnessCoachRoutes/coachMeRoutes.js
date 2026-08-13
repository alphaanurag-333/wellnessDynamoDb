const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  getCoachPermissionsController,
} = require("../../controllers/wellnessCoachController/permissionsController");

const router = express.Router();

/** Non-auth coach session helpers (permissions). Login/profile live under /account/auth. */
router.get("/permissions", protectWellnessCoach, getCoachPermissionsController);

module.exports = router;
