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

const catalogRead = authorizeStaff(["console.cf.view", "console.diet.view"], {
  admin: ["wellness-prescriptions.view", "users.clientHub.care.wellness-prescriptions"],
  wellness_coach: "clientTab.care.wellness-prescriptions",
  assistant_wellness_coach: "clientTab.care.wellness-prescriptions",
  trainee: "clientTab.care.wellness-prescriptions",
});

router.get("/", protectAccount, catalogRead, listWellnessPrescriptionCatalogController);
router.get("/:id", protectAccount, catalogRead, getWellnessPrescriptionCatalogByIdController);
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
