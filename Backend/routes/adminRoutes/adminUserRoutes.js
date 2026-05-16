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

const router = express.Router();

router.get("/", protectAdmin, listUsersController);
router.get("/:id", protectAdmin, getUserByIdController);
router.post("/", protectAdmin, optionalUserFile, createUserController);
router.patch("/:id", protectAdmin, optionalUserFile, updateUserController);
router.delete("/:id", protectAdmin, deleteUserController);

module.exports = router;
