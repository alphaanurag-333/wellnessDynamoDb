const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalTransformationFiles } = require("../../middleware/authMultipart");
const {
  listTransformationsController,
  getTransformationByIdController,
  createTransformationController,
  updateTransformationController,
  deleteTransformationController,
} = require("../../controllers/adminController/transformationController");

const router = express.Router();

router.get("/", protectAdmin, authorize("transformations.view"), listTransformationsController);
router.get("/:id", protectAdmin, authorize("transformations.view"), getTransformationByIdController);
router.post(
  "/",
  protectAdmin,
  authorize("transformations.edit"),
  optionalTransformationFiles,
  createTransformationController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("transformations.edit"),
  optionalTransformationFiles,
  updateTransformationController
);
router.delete("/:id", protectAdmin, authorize("transformations.delete"), deleteTransformationController);

module.exports = router;
