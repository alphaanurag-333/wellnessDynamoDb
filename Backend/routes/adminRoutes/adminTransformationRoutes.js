const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalTransformationFiles } = require("../../middleware/authMultipart");
const {
  listTransformationsController,
  getTransformationByIdController,
  createTransformationController,
  updateTransformationController,
  deleteTransformationController,
} = require("../../controllers/adminController/transformationController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.ct.view", { admin: "transformations.view" }), listTransformationsController);
router.get("/:id", protectAccount, authorizeStaff("console.ct.view", { admin: "transformations.view" }), getTransformationByIdController);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.ct.edit", { admin: "transformations.edit" }),
  optionalTransformationFiles,
  createTransformationController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.ct.edit", { admin: "transformations.edit" }),
  optionalTransformationFiles,
  updateTransformationController
);
router.delete("/:id", protectAccount, authorizeStaff("console.ct.delete", { admin: "transformations.delete" }), deleteTransformationController);

module.exports = router;
