const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listHealUsersForCoachPortalController,
  reassignHealUserForCoachPortalController,
} = require("../../controllers/adminController/userAssignmentController");

const router = express.Router();

router.get("/", protectWellnessCoach, listHealUsersForCoachPortalController);
router.post("/:id/reassign", protectWellnessCoach, reassignHealUserForCoachPortalController);

module.exports = router;
