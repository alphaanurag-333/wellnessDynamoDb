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

const catalogRead = authorizeStaff(["console.cf.view", "console.diet.view"], {
  admin: "diet-plan-catalog.view",
  wellness_coach: "clientTab.care.diet-plan",
  assistant_wellness_coach: "clientTab.care.diet-plan",
  trainee: "clientTab.care.diet-plan",
});

router.get("/", protectAccount, catalogRead, listDietPlanCatalogController);
router.get("/:id", protectAccount, catalogRead, getDietPlanCatalogByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "diet-plan-catalog.edit" }), createDietPlanCatalogController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "diet-plan-catalog.edit" }), updateDietPlanCatalogController);
router.delete(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.delete", { admin: "diet-plan-catalog.delete" }),
  deleteDietPlanCatalogController
);

module.exports = router;
