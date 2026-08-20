const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier, forbidEagleClient } = require("../../middleware/tierGuards");
const { optionalMealPhotoFile } = require("../../middleware/authMultipart");
const {
  getUserMealTrackingController,
  getUserMealLogByIdController,
  createUserMealLogController,
  updateUserMealLogController,
  deleteUserMealLogController,
} = require("../../controllers/userController/mealTrackingController");

const router = express.Router();

router.get("/", protectUser, requireHealTier, forbidEagleClient, getUserMealTrackingController);
router.get("/:logId", protectUser, requireHealTier, forbidEagleClient, getUserMealLogByIdController);
router.post("/", protectUser, requireHealTier, forbidEagleClient, optionalMealPhotoFile, createUserMealLogController);
router.put("/:logId", protectUser, requireHealTier, forbidEagleClient, optionalMealPhotoFile, updateUserMealLogController);
router.delete("/:logId", protectUser, requireHealTier, forbidEagleClient, deleteUserMealLogController);

module.exports = router;
