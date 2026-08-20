const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier, forbidEagleClient } = require("../../middleware/tierGuards");
const {
  getUserAssignedDietPlansController,
  getUserAssignedDietPlanByIdController,
} = require("../../controllers/userController/dietPlanCatalogController");

const router = express.Router();

router.get("/assigned", protectUser, requireHealTier, forbidEagleClient, getUserAssignedDietPlansController);
router.get("/assigned/:id", protectUser, requireHealTier, forbidEagleClient, getUserAssignedDietPlanByIdController);

module.exports = router;
