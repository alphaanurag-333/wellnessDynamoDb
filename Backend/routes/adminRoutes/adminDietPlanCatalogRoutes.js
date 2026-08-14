const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listDietPlanCatalogController,
  getDietPlanCatalogByIdController,
  createDietPlanCatalogController,
  updateDietPlanCatalogController,
  deleteDietPlanCatalogController,
} = require("../../controllers/adminController/dietPlanCatalogController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "diet-plan-catalog.view" }), listDietPlanCatalogController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "diet-plan-catalog.view" }), getDietPlanCatalogByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "diet-plan-catalog.edit" }), createDietPlanCatalogController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "diet-plan-catalog.edit" }), updateDietPlanCatalogController);
router.delete(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.delete", { admin: "diet-plan-catalog.delete" }),
  deleteDietPlanCatalogController
);

module.exports = router;
