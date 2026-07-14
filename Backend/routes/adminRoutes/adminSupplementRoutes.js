const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalSupplementFile } = require("../../middleware/authMultipart");
const {
  listSupplementsController,
  getSupplementByIdController,
  createSupplementController,
  updateSupplementController,
  deleteSupplementController,
} = require("../../controllers/adminController/supplementController");

const router = express.Router();

router.get("/", protectAdmin, authorize("supplements.view"), listSupplementsController);
router.get("/:id", protectAdmin, authorize("supplements.view"), getSupplementByIdController);
router.post(
  "/",
  protectAdmin,
  authorize("supplements.edit"),
  optionalSupplementFile,
  createSupplementController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("supplements.edit"),
  optionalSupplementFile,
  updateSupplementController
);
router.delete("/:id", protectAdmin, authorize("supplements.delete"), deleteSupplementController);

module.exports = router;
