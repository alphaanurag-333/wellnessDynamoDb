const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
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
  protectAccount,
  authorizeStaff("console.cf.view", { admin: "wellness-prescriptions.view" }),
  listWellnessPrescriptionCatalogController
);
router.get(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.view", { admin: "wellness-prescriptions.view" }),
  getWellnessPrescriptionCatalogByIdController
);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "wellness-prescriptions.edit" }),
  createWellnessPrescriptionCatalogController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "wellness-prescriptions.edit" }),
  updateWellnessPrescriptionCatalogController
);
router.delete(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.delete", { admin: "wellness-prescriptions.delete" }),
  deleteWellnessPrescriptionCatalogController
);

module.exports = router;
