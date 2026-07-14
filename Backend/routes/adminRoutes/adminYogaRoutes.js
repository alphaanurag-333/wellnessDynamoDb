const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalYogaFile } = require("../../middleware/authMultipart");
const {
  listYogaController,
  getYogaByIdController,
  createYogaController,
  updateYogaController,
  deleteYogaController,
} = require("../../controllers/adminController/yogaController");

const router = express.Router();

router.get("/", protectAdmin, authorize("yoga.view"), listYogaController);
router.get("/:id", protectAdmin, authorize("yoga.view"), getYogaByIdController);
router.post("/", protectAdmin, authorize("yoga.edit"), optionalYogaFile, createYogaController);
router.patch("/:id", protectAdmin, authorize("yoga.edit"), optionalYogaFile, updateYogaController);
router.delete("/:id", protectAdmin, authorize("yoga.delete"), deleteYogaController);

module.exports = router;
