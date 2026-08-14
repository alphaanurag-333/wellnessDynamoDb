const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalMentalWellbeingFile } = require("../../middleware/authMultipart");
const {
  listMentalWellbeingController,
  getMentalWellbeingByIdController,
  createMentalWellbeingController,
  updateMentalWellbeingController,
  deleteMentalWellbeingController,
} = require("../../controllers/adminController/mentalWellbeingController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "mental-wellbeing.view" }), listMentalWellbeingController);
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
