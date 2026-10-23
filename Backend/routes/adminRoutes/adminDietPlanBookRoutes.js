const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listDietPlanBookController,
  getDietPlanBookByIdController,
  createDietPlanBookController,
  updateDietPlanBookController,
  deleteDietPlanBookController,
} = require("../../controllers/adminController/dietPlanBookController");

const router = express.Router();

const bookRead = authorizeStaff(["console.cf.view", "console.diet.view"], {
  admin: "diet-plan-catalog.view",
  wellness_coach: "clientTab.care.diet-plan",
  assistant_wellness_coach: "clientTab.care.diet-plan",
  trainee: "clientTab.care.diet-plan",
});

router.get("/", protectAccount, bookRead, listDietPlanBookController);
router.get("/:id", protectAccount, bookRead, getDietPlanBookByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "diet-plan-catalog.edit" }), createDietPlanBookController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "diet-plan-catalog.edit" }), updateDietPlanBookController);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "diet-plan-catalog.delete" }), deleteDietPlanBookController);

module.exports = router;
