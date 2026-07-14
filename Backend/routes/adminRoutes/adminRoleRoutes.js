const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { requireSuperAdmin } = require("../../middleware/authorize");
const {
  listRolesController,
  getRoleByIdController,
  createRoleController,
  updateRoleController,
  deleteRoleController,
} = require("../../controllers/adminController/roleController");

const router = express.Router();

// Super Admin only.
router.use(protectAdmin, requireSuperAdmin);

router.get("/", listRolesController);
router.get("/:id", getRoleByIdController);
router.post("/", createRoleController);
router.patch("/:id", updateRoleController);
router.delete("/:id", deleteRoleController);

module.exports = router;
