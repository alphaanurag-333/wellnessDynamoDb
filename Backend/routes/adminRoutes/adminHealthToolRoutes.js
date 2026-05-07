const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { optionalHealthToolFile } = require("../../middleware/authMultipart");
const {
  listHealthToolsController,
  getHealthToolByIdController,
  createHealthToolController,
  updateHealthToolController,
  deleteHealthToolController,
} = require("../../controllers/adminController/healthToolController");

const router = express.Router();

router.get("/", protectAdmin, listHealthToolsController);
router.get("/:id", protectAdmin, getHealthToolByIdController);
router.post("/", protectAdmin, optionalHealthToolFile, createHealthToolController);
router.patch("/:id", protectAdmin, optionalHealthToolFile, updateHealthToolController);
router.delete("/:id", protectAdmin, deleteHealthToolController);

module.exports = router;
