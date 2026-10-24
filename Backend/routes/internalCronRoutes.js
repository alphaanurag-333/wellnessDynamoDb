const express = require("express");
const { requireCronSecret } = require("../middleware/cronSecret");
const {
  runDailyReflectionBedtimeCronController,
} = require("../controllers/internalCronController");

const router = express.Router();

router.post(
  "/daily-reflection-bedtime",
  requireCronSecret,
  runDailyReflectionBedtimeCronController
);

module.exports = router;
