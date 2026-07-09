const express = require("express");
const { protectUser } = require("../../middleware/auth");
const {
  getMySleepTrackingController,
  syncMySleepTrackingController,
} = require("../../controllers/userController/sleepTrackingController");

const router = express.Router();

router.use(protectUser);

router.get("/", getMySleepTrackingController);
router.post("/sync", syncMySleepTrackingController);

module.exports = router;
