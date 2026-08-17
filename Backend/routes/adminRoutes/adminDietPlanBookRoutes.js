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

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "diet-plan-catalog.view" }), listDietPlanBookController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "diet-plan-catalog.view" }), getDietPlanBookByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "diet-plan-catalog.edit" }), createDietPlanBookController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "diet-plan-catalog.edit" }), updateDietPlanBookController);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "diet-plan-catalog.delete" }), deleteDietPlanBookController);

module.exports = router;
