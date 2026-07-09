const express = require("express");
const { protectUser } = require("../../middleware/auth");
const {
  getMyHeartRateTrackingController,
  syncMyHeartRateTrackingController,
} = require("../../controllers/userController/heartRateTrackingController");

const router = express.Router();

router.use(protectUser);

router.get("/", getMyHeartRateTrackingController);
router.post("/sync", syncMyHeartRateTrackingController);

module.exports = router;
