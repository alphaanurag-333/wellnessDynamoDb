const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { optionalSupplementFile } = require("../../middleware/authMultipart");
const {
  listSupplementsController,
  getSupplementByIdController,
  createSupplementController,
  updateSupplementController,
  deleteSupplementController,
} = require("../../controllers/adminController/supplementController");

const router = express.Router();

router.get("/", protectAdmin, listSupplementsController);
router.get("/:id", protectAdmin, getSupplementByIdController);
router.post("/", protectAdmin, optionalSupplementFile, createSupplementController);
router.patch("/:id", protectAdmin, optionalSupplementFile, updateSupplementController);
router.delete("/:id", protectAdmin, deleteSupplementController);

module.exports = router;
