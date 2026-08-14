const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listTestCatalogController,
  getTestCatalogByIdController,
  createTestCatalogController,
  updateTestCatalogController,
  deleteTestCatalogController,
} = require("../../controllers/adminController/testCatalogController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "test-catalog.view" }), listTestCatalogController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "test-catalog.view" }), getTestCatalogByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "test-catalog.edit" }), createTestCatalogController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "test-catalog.edit" }), updateTestCatalogController);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "test-catalog.delete" }), deleteTestCatalogController);

module.exports = router;
