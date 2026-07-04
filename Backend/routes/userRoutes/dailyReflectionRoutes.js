const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier } = require("../../middleware/tierGuards");
const {
  getMyDailyReflectionController,
  submitMyDailyReflectionController,
  getMyDailyReflectionScoreController,
  getMyDailyReflectionHistoryController,
  recordPluggedHeadphonesController,
} = require("../../controllers/userController/dailyReflectionController");

const router = express.Router();

router.use(protectUser, requireHealTier);

router.get("/", getMyDailyReflectionController);
router.post("/", submitMyDailyReflectionController);
router.get("/score", getMyDailyReflectionScoreController);
router.get("/history", getMyDailyReflectionHistoryController);
router.patch("/plugged-headphones", recordPluggedHeadphonesController);

module.exports = router;
