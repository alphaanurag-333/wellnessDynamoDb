const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const {
  adminListUserDietPlansController,
  adminDeleteDietPlanController,
} = require("../../controllers/adminController/dietPlanController");

const router = express.Router();

router.get("/users/:userId", protectAdmin, adminListUserDietPlansController);
router.delete("/:planId", protectAdmin, adminDeleteDietPlanController);

module.exports = router;
