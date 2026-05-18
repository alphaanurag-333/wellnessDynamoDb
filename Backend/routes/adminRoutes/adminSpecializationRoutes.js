const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const {
  listSpecializationsController,
  getSpecializationByIdController,
  createSpecializationController,
  updateSpecializationController,
  deleteSpecializationController,
} = require("../../controllers/adminController/specializationController");

const router = express.Router();

router.get("/", protectAdmin, listSpecializationsController);
router.get("/:id", protectAdmin, getSpecializationByIdController);
router.post("/", protectAdmin, createSpecializationController);
router.patch("/:id", protectAdmin, updateSpecializationController);
router.delete("/:id", protectAdmin, deleteSpecializationController);

module.exports = router;
