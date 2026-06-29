const express = require("express");
const { protectUser } = require("../../middleware/auth");
const { requireHealTier } = require("../../middleware/tierGuards");
const { optionalMealPhotoFile } = require("../../middleware/authMultipart");
const {
  getUserMealTrackingController,
  getUserMealLogByIdController,
  createUserMealLogController,
  updateUserMealLogController,
  deleteUserMealLogController,
} = require("../../controllers/userController/mealTrackingController");

const router = express.Router();

router.get("/", protectUser, requireHealTier, getUserMealTrackingController);
router.get("/:logId", protectUser, requireHealTier, getUserMealLogByIdController);
router.post("/", protectUser, requireHealTier, optionalMealPhotoFile, createUserMealLogController);
router.put("/:logId", protectUser, requireHealTier, optionalMealPhotoFile, updateUserMealLogController);
router.delete("/:logId", protectUser, requireHealTier, deleteUserMealLogController);

module.exports = router;
