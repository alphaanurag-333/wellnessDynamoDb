const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalHealthRecipeFile } = require("../../middleware/authMultipart");
const {
  listHealthRecipesController,
  getHealthRecipeByIdController,
  createHealthRecipeController,
  updateHealthRecipeController,
  deleteHealthRecipeController,
} = require("../../controllers/adminController/healthRecipeController");

const router = express.Router();

router.get("/", protectAdmin, authorize("health-recipes.view"), listHealthRecipesController);
router.get("/:id", protectAdmin, authorize("health-recipes.view"), getHealthRecipeByIdController);
router.post(
  "/",
  protectAdmin,
  authorize("health-recipes.edit"),
  optionalHealthRecipeFile,
  createHealthRecipeController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("health-recipes.edit"),
  optionalHealthRecipeFile,
  updateHealthRecipeController
);
router.delete("/:id", protectAdmin, authorize("health-recipes.delete"), deleteHealthRecipeController);

module.exports = router;
