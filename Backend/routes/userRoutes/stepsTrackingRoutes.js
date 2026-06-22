const express = require("express");
const { protectUser } = require("../../middleware/auth");
const {
  getMyStepsTrackingController,
  syncMyStepsTrackingController,
  updateMyStepsGoalController,
  setMyStepsDayController,
} = require("../../controllers/userController/stepsTrackingController");

const router = express.Router();

router.use(protectUser);

router.get("/", getMyStepsTrackingController);
router.post("/sync", syncMyStepsTrackingController);
router.patch("/goal", updateMyStepsGoalController);
router.put("/day", setMyStepsDayController);

module.exports = router;
