const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listDietPlanCatalogController,
  getDietPlanCatalogByIdController,
  createDietPlanCatalogController,
  updateDietPlanCatalogController,
  deleteDietPlanCatalogController,
} = require("../../controllers/adminController/dietPlanCatalogController");

const router = express.Router();

router.get("/", protectAdmin, authorize("diet-plan-catalog.view"), listDietPlanCatalogController);
router.get("/:id", protectAdmin, authorize("diet-plan-catalog.view"), getDietPlanCatalogByIdController);
router.post("/", protectAdmin, authorize("diet-plan-catalog.edit"), createDietPlanCatalogController);
router.patch("/:id", protectAdmin, authorize("diet-plan-catalog.edit"), updateDietPlanCatalogController);
router.delete(
  "/:id",
  protectAdmin,
  authorize("diet-plan-catalog.delete"),
  deleteDietPlanCatalogController
);

module.exports = router;
