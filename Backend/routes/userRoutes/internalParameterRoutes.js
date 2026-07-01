const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier } = require("../../middleware/tierGuards");
const { optionalDietPlanFile } = require("../../middleware/authMultipart");
const {
  getUserRecommendedTestsController,
  listUserLabReportsController,
  createUserLabReportController,
  deleteUserLabReportController,
} = require("../../controllers/userController/internalParameterController");

const router = express.Router();

router.get("/recommended", protectUser, requireHealTier, getUserRecommendedTestsController);
router.get("/reports", protectUser, requireHealTier, listUserLabReportsController);
router.post("/reports", protectUser, requireHealTier, optionalDietPlanFile, createUserLabReportController);
router.delete("/reports/:id", protectUser, requireHealTier, deleteUserLabReportController);

module.exports = router;
