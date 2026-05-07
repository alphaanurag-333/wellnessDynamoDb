const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { optionalHealthRecipeFile } = require("../../middleware/authMultipart");
const {
  listHealthRecipesController,
  getHealthRecipeByIdController,
  createHealthRecipeController,
  updateHealthRecipeController,
  deleteHealthRecipeController,
} = require("../../controllers/adminController/healthRecipeController");

const router = express.Router();

router.get("/", protectAdmin, listHealthRecipesController);
router.get("/:id", protectAdmin, getHealthRecipeByIdController);
router.post("/", protectAdmin, optionalHealthRecipeFile, createHealthRecipeController);
router.patch("/:id", protectAdmin, optionalHealthRecipeFile, updateHealthRecipeController);
router.delete("/:id", protectAdmin, deleteHealthRecipeController);

module.exports = router;
