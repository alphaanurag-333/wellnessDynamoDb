const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listTestCatalogController,
  getTestCatalogByIdController,
  createTestCatalogController,
  updateTestCatalogController,
  deleteTestCatalogController,
} = require("../../controllers/adminController/testCatalogController");

const router = express.Router();

router.get("/", protectAdmin, authorize("test-catalog.view"), listTestCatalogController);
router.get("/:id", protectAdmin, authorize("test-catalog.view"), getTestCatalogByIdController);
router.post("/", protectAdmin, authorize("test-catalog.edit"), createTestCatalogController);
router.patch("/:id", protectAdmin, authorize("test-catalog.edit"), updateTestCatalogController);
router.delete("/:id", protectAdmin, authorize("test-catalog.delete"), deleteTestCatalogController);

module.exports = router;
