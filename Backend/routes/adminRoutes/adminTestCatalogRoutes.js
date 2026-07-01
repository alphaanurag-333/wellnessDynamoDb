const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const {
  listTestCatalogController,
  getTestCatalogByIdController,
  createTestCatalogController,
  updateTestCatalogController,
  deleteTestCatalogController,
} = require("../../controllers/adminController/testCatalogController");

const router = express.Router();

router.get("/", protectAdmin, listTestCatalogController);
router.get("/:id", protectAdmin, getTestCatalogByIdController);
router.post("/", protectAdmin, createTestCatalogController);
router.patch("/:id", protectAdmin, updateTestCatalogController);
router.delete("/:id", protectAdmin, deleteTestCatalogController);

module.exports = router;
