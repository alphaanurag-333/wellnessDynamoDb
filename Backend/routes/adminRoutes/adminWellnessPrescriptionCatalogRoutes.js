const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const {
  listWellnessPrescriptionCatalogController,
  getWellnessPrescriptionCatalogByIdController,
  createWellnessPrescriptionCatalogController,
  updateWellnessPrescriptionCatalogController,
  deleteWellnessPrescriptionCatalogController,
} = require("../../controllers/adminController/wellnessPrescriptionCatalogController");

const router = express.Router();

router.get("/", protectAdmin, listWellnessPrescriptionCatalogController);
router.get("/:id", protectAdmin, getWellnessPrescriptionCatalogByIdController);
router.post("/", protectAdmin, createWellnessPrescriptionCatalogController);
router.patch("/:id", protectAdmin, updateWellnessPrescriptionCatalogController);
router.delete("/:id", protectAdmin, deleteWellnessPrescriptionCatalogController);

module.exports = router;
