const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const {
  listHealthDisordersController,
  getHealthDisorderByIdController,
  createHealthDisorderController,
  updateHealthDisorderController,
  deleteHealthDisorderController,
} = require("../../controllers/adminController/healthDisorderController");

const router = express.Router();

router.get("/", protectAdmin, listHealthDisordersController);
router.get("/:id", protectAdmin, getHealthDisorderByIdController);
router.post("/", protectAdmin, createHealthDisorderController);
router.patch("/:id", protectAdmin, updateHealthDisorderController);
router.delete("/:id", protectAdmin, deleteHealthDisorderController);

module.exports = router;
