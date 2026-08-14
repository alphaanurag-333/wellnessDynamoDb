const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalHealthRecipeFile } = require("../../middleware/authMultipart");
const {
  listHealthRecipesController,
  getHealthRecipeByIdController,
  createHealthRecipeController,
  updateHealthRecipeController,
  deleteHealthRecipeController,
} = require("../../controllers/adminController/healthRecipeController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "health-recipes.view" }), listHealthRecipesController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "health-recipes.view" }), getHealthRecipeByIdController);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "health-recipes.edit" }),
  optionalHealthRecipeFile,
  createHealthRecipeController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "health-recipes.edit" }),
  optionalHealthRecipeFile,
  updateHealthRecipeController
);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "health-recipes.delete" }), deleteHealthRecipeController);

module.exports = router;
