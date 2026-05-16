const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { optionalYogaFile } = require("../../middleware/authMultipart");
const {
  listYogaController,
  getYogaByIdController,
  createYogaController,
  updateYogaController,
  deleteYogaController,
} = require("../../controllers/adminController/yogaController");

const router = express.Router();

router.get("/", protectAdmin, listYogaController);
router.get("/:id", protectAdmin, getYogaByIdController);
router.post("/", protectAdmin, optionalYogaFile, createYogaController);
router.patch("/:id", protectAdmin, optionalYogaFile, updateYogaController);
router.delete("/:id", protectAdmin, deleteYogaController);

module.exports = router;
