const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier } = require("../../middleware/tierGuards");
const { optionalDietPlanFile } = require("../../middleware/authMultipart");
const {
  getUserLabReportSubmissionController,
  getUserRecommendedTestsController,
  listUserLabReportsController,
  createUserLabReportController,
  deleteUserLabReportController,
} = require("../../controllers/userController/internalParameterController");

const router = express.Router();

router.get("/lab-report-submission", protectUser, requireHealTier, getUserLabReportSubmissionController);
router.get("/recommended", protectUser, requireHealTier, getUserRecommendedTestsController);
router.get("/reports", protectUser, requireHealTier, listUserLabReportsController);
router.post("/reports", protectUser, requireHealTier, optionalDietPlanFile, createUserLabReportController);
router.delete("/reports/:id", protectUser, requireHealTier, deleteUserLabReportController);

module.exports = router;
