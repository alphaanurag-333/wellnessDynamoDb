const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listSpecializationsController,
  getSpecializationByIdController,
  createSpecializationController,
  updateSpecializationController,
  deleteSpecializationController,
} = require("../../controllers/adminController/specializationController");

const router = express.Router();

router.get("/", protectAdmin, authorize("specializations.view"), listSpecializationsController);
router.get("/:id", protectAdmin, authorize("specializations.view"), getSpecializationByIdController);
router.post("/", protectAdmin, authorize("specializations.edit"), createSpecializationController);
router.patch("/:id", protectAdmin, authorize("specializations.edit"), updateSpecializationController);
router.delete("/:id", protectAdmin, authorize("specializations.delete"), deleteSpecializationController);

module.exports = router;
