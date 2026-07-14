const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { requireSuperAdmin } = require("../../middleware/authorize");
const { getPermissionCatalogController } = require("../../controllers/adminController/roleController");

const router = express.Router();

// Super Admin only — powers the Roles & Permissions checkbox tree.
router.get("/", protectAdmin, requireSuperAdmin, getPermissionCatalogController);

module.exports = router;
