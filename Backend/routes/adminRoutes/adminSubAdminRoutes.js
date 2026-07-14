const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { requireSuperAdmin } = require("../../middleware/authorize");
const { optionalAdminFile } = require("../../middleware/authMultipart");
const {
  listSubAdminsController,
  getSubAdminByIdController,
  createSubAdminController,
  updateSubAdminController,
  updateSubAdminStatusController,
  deleteSubAdminController,
} = require("../../controllers/adminController/subAdminController");

const router = express.Router();

// Super Admin only — sub-admins can never manage other sub-admins, even if a
// role were misconfigured to grant a matching-looking permission slug.
router.use(protectAdmin, requireSuperAdmin);

router.get("/", listSubAdminsController);
router.get("/:id", getSubAdminByIdController);
router.post("/", optionalAdminFile, createSubAdminController);
router.patch("/:id", optionalAdminFile, updateSubAdminController);
router.patch("/:id/status", updateSubAdminStatusController);
router.delete("/:id", deleteSubAdminController);

module.exports = router;
