const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listHealthDisordersController,
  getHealthDisorderByIdController,
  createHealthDisorderController,
  updateHealthDisorderController,
  deleteHealthDisorderController,
} = require("../../controllers/adminController/healthDisorderController");

const router = express.Router();

router.get("/", protectAdmin, authorize("health-disorders.view"), listHealthDisordersController);
router.get("/:id", protectAdmin, authorize("health-disorders.view"), getHealthDisorderByIdController);
router.post("/", protectAdmin, authorize("health-disorders.edit"), createHealthDisorderController);
router.patch("/:id", protectAdmin, authorize("health-disorders.edit"), updateHealthDisorderController);
router.delete("/:id", protectAdmin, authorize("health-disorders.delete"), deleteHealthDisorderController);

module.exports = router;
