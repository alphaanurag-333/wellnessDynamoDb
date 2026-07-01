const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier } = require("../../middleware/tierGuards");
const {
  getUserAssignedDietPlansController,
  getUserAssignedDietPlanByIdController,
} = require("../../controllers/userController/dietPlanCatalogController");

const router = express.Router();

router.get("/assigned", protectUser, requireHealTier, getUserAssignedDietPlansController);
router.get("/assigned/:id", protectUser, requireHealTier, getUserAssignedDietPlanByIdController);

module.exports = router;
