const express = require("express");
const { protectUser } = require("../../middleware/auth");
const {
  getMyWaterTrackingController,
  updateMyWaterGoalController,
  incrementMyWaterController,
  decrementMyWaterController,
  setMyWaterDayController,
} = require("../../controllers/userController/waterTrackingController");

const router = express.Router();

router.use(protectUser);

router.get("/", getMyWaterTrackingController);
router.patch("/goal", updateMyWaterGoalController);
router.post("/increment", incrementMyWaterController);
router.post("/decrement", decrementMyWaterController);
router.put("/day", setMyWaterDayController);

module.exports = router;
