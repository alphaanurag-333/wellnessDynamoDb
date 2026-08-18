const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalMentalWellbeingFile } = require("../../middleware/authMultipart");
const { previewYoutubeDurationController } = require("../../controllers/adminController/wellnessLibraryMetaController");
const {
  listMentalWellbeingController,
  getMentalWellbeingByIdController,
  createMentalWellbeingController,
  updateMentalWellbeingController,
  deleteMentalWellbeingController,
} = require("../../controllers/adminController/mentalWellbeingController");

const router = express.Router();

router.get(
  "/",
  protectAccount,
  authorizeStaff(["console.cf.view", "console.diet.view"], {
    admin: ["mental-wellbeing.view", "users.clientHub.wellness.mental-wellbeing"],
    coach: "clientTab.wellness.mental-wellbeing",
  }),
  listMentalWellbeingController
);
router.get(
  "/youtube-duration",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "mental-wellbeing.edit" }),
  previewYoutubeDurationController
);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "mental-wellbeing.view" }), getMentalWellbeingByIdController);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "mental-wellbeing.edit" }),
  optionalMentalWellbeingFile,
  createMentalWellbeingController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "mental-wellbeing.edit" }),
  optionalMentalWellbeingFile,
  updateMentalWellbeingController
);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "mental-wellbeing.delete" }), deleteMentalWellbeingController);

module.exports = router;
