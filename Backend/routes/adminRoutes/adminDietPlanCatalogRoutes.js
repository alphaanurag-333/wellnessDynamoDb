const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const {
  listDietPlanCatalogController,
  getDietPlanCatalogByIdController,
  createDietPlanCatalogController,
  updateDietPlanCatalogController,
  deleteDietPlanCatalogController,
} = require("../../controllers/adminController/dietPlanCatalogController");

const router = express.Router();

router.get("/", protectAdmin, listDietPlanCatalogController);
router.get("/:id", protectAdmin, getDietPlanCatalogByIdController);
router.post("/", protectAdmin, createDietPlanCatalogController);
router.patch("/:id", protectAdmin, updateDietPlanCatalogController);
router.delete("/:id", protectAdmin, deleteDietPlanCatalogController);

module.exports = router;
