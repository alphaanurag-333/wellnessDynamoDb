const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { requireClientAccess } = require("../../middleware/requireClientAccess");
const { authorize } = require("../../middleware/authorize");
const {
  listAdminUserWellnessPrescriptionsController,
  createAdminUserWellnessPrescriptionController,
  deleteAdminUserWellnessPrescriptionController,
} = require("../../controllers/adminController/healUser/wellnessPrescriptionController.js");

const router = express.Router({ mergeParams: true });

router.get(
  "/:userId/wellness-prescriptions",
  protectAdmin, requireClientAccess, authorize("users.clientHub.care.wellness-prescriptions"),
  listAdminUserWellnessPrescriptionsController
);
router.post(
  "/:userId/wellness-prescriptions",
  protectAdmin, requireClientAccess, authorize("users.clientHub.care.wellness-prescriptions"),
  createAdminUserWellnessPrescriptionController
);
router.delete(
  "/:userId/wellness-prescriptions/:assignmentId",
  protectAdmin, requireClientAccess, authorize("users.clientHub.care.wellness-prescriptions"),
  deleteAdminUserWellnessPrescriptionController
);

module.exports = router;
