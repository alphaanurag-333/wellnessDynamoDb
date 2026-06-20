const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { optionalUserFile } = require("../../middleware/authMultipart");
const {
  listUsersController,
  getUserByIdController,
  createUserController,
  updateUserController,
  deleteUserController,
} = require("../../controllers/adminController/userController");
const {
  convertUserToHealController,
  assignHealUserController,
  reassignHealUserController,
} = require("../../controllers/adminController/userAssignmentController");
const { getUserWaterTrackingHistoryController } = require("../../controllers/waterTrackingHistoryController");

const router = express.Router();

router.get("/", protectAdmin, listUsersController);
router.get("/:id/water-tracking", protectAdmin, getUserWaterTrackingHistoryController);
router.get("/:id", protectAdmin, getUserByIdController);
router.post("/", protectAdmin, optionalUserFile, createUserController);
router.post("/:id/convert-to-heal", protectAdmin, convertUserToHealController);
router.post("/:id/assign-coach", protectAdmin, assignHealUserController);
router.post("/:id/reassign-coach", protectAdmin, reassignHealUserController);
router.patch("/:id", protectAdmin, optionalUserFile, updateUserController);
router.delete("/:id", protectAdmin, deleteUserController);

module.exports = router;
