const express = require("express");

const { protectStaff } = require("../../middleware/auth");
const { requireSuperAdmin } = require("../../middleware/authorize");
const {
  listRolesController,
  getRoleByIdController,
  createRoleController,
  updateRoleController,
  deleteRoleController,
} = require("../../controllers/staffController/staffRoleController");

const router = express.Router();

// Super Admin only — any staff account type.
router.use(protectStaff(), requireSuperAdmin);

router.get("/", listRolesController);
router.get("/:id", getRoleByIdController);
router.post("/", createRoleController);
router.patch("/:id", updateRoleController);
router.delete("/:id", deleteRoleController);

module.exports = router;
