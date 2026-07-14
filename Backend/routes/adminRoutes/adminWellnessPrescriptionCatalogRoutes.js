const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listWellnessPrescriptionCatalogController,
  getWellnessPrescriptionCatalogByIdController,
  createWellnessPrescriptionCatalogController,
  updateWellnessPrescriptionCatalogController,
  deleteWellnessPrescriptionCatalogController,
} = require("../../controllers/adminController/wellnessPrescriptionCatalogController");

const router = express.Router();

router.get(
  "/",
  protectAdmin,
  authorize("wellness-prescriptions.view"),
  listWellnessPrescriptionCatalogController
);
router.get(
  "/:id",
  protectAdmin,
  authorize("wellness-prescriptions.view"),
  getWellnessPrescriptionCatalogByIdController
);
router.post(
  "/",
  protectAdmin,
  authorize("wellness-prescriptions.edit"),
  createWellnessPrescriptionCatalogController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("wellness-prescriptions.edit"),
  updateWellnessPrescriptionCatalogController
);
router.delete(
  "/:id",
  protectAdmin,
  authorize("wellness-prescriptions.delete"),
  deleteWellnessPrescriptionCatalogController
);

module.exports = router;
